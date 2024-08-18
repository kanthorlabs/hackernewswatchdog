import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";
import * as admin from "firebase-admin";
import _ from "lodash";
import { ulid } from "ulid";
import * as deployment from "./deployment";
import {
  COLLECTION_CRAWLER,
  COLLECTION_USER,
  ICrawler,
  IDocument,
  DocumentType,
  IUser,
  IDocumentDiff,
  IAlert,
  COLLECTION_ALERT,
} from "./database";
import config from "./config";

export function parse(text: string): number {
  // number
  const num = text.match(/\/(watch|unwatch) (\d+)/);
  if (num && num[1] && Number.isSafeInteger(Number(num[2]))) {
    return Number(num[2]);
  }

  const url = text.match(/[?&]id=(\d+)/);
  if (url && url[1] && Number.isSafeInteger(Number(url[1]))) {
    return Number(url[1]);
  }

  return 0;
}

export async function get(id: number): Promise<IDocument> {
  const base = new URL(deployment.HACKERNEWS_ENDPOINT);
  base.pathname = `v0/item/${id}.json`;

  const r = await fetch(base);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
  return (await r.json()) as IDocument;
}

export function toView(doc: IDocument, counter?: number): string[] {
  const time = new Date(doc.time * 1000).toISOString(); // Convert Unix timestamp to human-readable format
  const messages: string[] = [];

  if (counter) {
    const emoji = type2emoji(doc.type);
    messages.push(
      `🗳️ #${counter} - *${emoji} ${_.startCase(doc.type)} ${emoji}*`
    );
  }
  if (doc.title) messages.push(`📝 *Title:* ${doc.title}`);
  if (doc.url) messages.push(`🔗 *URL:* ${doc.url}`);
  messages.push(
    `🆔 *ID:* [${doc.id}](https://news.ycombinator.com/item?id=${doc.id})`
  );
  messages.push(
    `👤 *Author:* [${doc.by}](https://news.ycombinator.com/user?id=${doc.by})`
  );
  messages.push(`🕒 *Posted at:* ${time}`);

  if (Number.isSafeInteger(doc.score)) {
    messages.push(`⭐️ *Score:* ${doc.score}`);
  }
  if (Number.isSafeInteger(doc.descendants)) {
    messages.push(`💬 *Comments:* ${doc.descendants}`);
  }
  return messages;
}

function type2emoji(type: DocumentType): string {
  switch (type) {
    case DocumentType.Story:
      return "📖";
    case DocumentType.Comment:
      return "💬";
    case DocumentType.Job:
      return "💼";
    case DocumentType.Poll:
      return "📊";
    case DocumentType.PollOpt:
      return "🔘";
    default:
      return "📝";
  }
}

export async function watch(user: IUser, doc: IDocument) {
  return admin.firestore().runTransaction(async (tx) => {
    const uref = admin.firestore().collection(COLLECTION_USER).doc(user.id);
    let u = await tx.get(uref).then((s) => s.data() as IUser);
    if (!u) u = { ...user };
    if (!u.watch_list.includes(doc.id)) u.watch_list.push(doc.id);

    const cref = admin
      .firestore()
      .collection(COLLECTION_CRAWLER)
      .doc(String(doc.id));
    let c = await tx.get(cref).then((s) => s.data() as ICrawler);
    if (!c) {
      c = {
        id: doc.id,
        enqueue_at: new Date().getTime(),
        schedule_at: new Date().getTime() + config.crawler.init_delay,
        watch_by: [],
        doc,
        diff: { ts: new Date() },
      };
    }
    if (!c.watch_by.includes(user.id)) c.watch_by.push(user.id);

    tx.set(uref, u, { merge: true });
    tx.set(cref, c, { merge: true });
  });
}

export async function unwatch(user: IUser, doc: IDocument) {
  return admin.firestore().runTransaction(async (tx) => {
    const uref = admin.firestore().collection(COLLECTION_USER).doc(user.id);
    let u = await tx.get(uref).then((s) => s.data() as IUser);
    if (!u) u = { ...user };
    u.watch_list = u.watch_list.filter((d) => d !== doc.id);

    const cref = admin
      .firestore()
      .collection(COLLECTION_CRAWLER)
      .doc(String(doc.id));
    let c = await tx.get(cref).then((s) => s.data() as ICrawler);
    if (!c) {
      c = {
        id: doc.id,
        enqueue_at: new Date().getTime(),
        schedule_at: new Date().getTime() + config.crawler.init_delay,
        watch_by: [],
        doc,
        diff: { ts: new Date() },
      };
    }
    c.watch_by = c.watch_by.filter((d) => d !== user.id);
    // no watcher, disable schedule
    if (c.watch_by.length === 0) {
      c.schedule_at = -1;
    }

    tx.set(uref, u, { merge: true });
    tx.set(cref, c, { merge: true });
  });
}

export async function list(user: IUser) {
  const u = await admin
    .firestore()
    .collection(COLLECTION_USER)
    .doc(user.id)
    .get()
    .then((s) => s.data() as IUser);
  if (!u || u.watch_list.length === 0) return [];

  return await admin
    .firestore()
    .collection(COLLECTION_CRAWLER)
    .where(admin.firestore.FieldPath.documentId(), "in", u.watch_list)
    .get()
    .then((s) => s.docs.map((d) => d.data() as ICrawler).map((d) => d.doc));
}

export async function track(cid: number) {
  return admin.firestore().runTransaction(async (tx) => {
    const cref = admin
      .firestore()
      .collection(COLLECTION_CRAWLER)
      .doc(String(cid));
    let crawler = await tx.get(cref).then((s) => s.data() as ICrawler);
    if (!crawler) {
      logger.error(`crawler ${cid} is not found`);
      return null;
    }

    const prev = crawler.doc;
    const next = await get(crawler.id);

    // update latest doc
    crawler.doc = next;
    // update diff
    crawler.diff = diff(prev, next);
    tx.set(cref, crawler, { merge: true });

    let alerts: IAlert[] = [];
    if (crawler.watch_by.length > 0 && hasDiff(crawler.diff)) {
      alerts = crawler.watch_by.map((uid) => ({
        id: ulid(),
        crawler_id: crawler.id,
        uid,
        diff: crawler.diff,
        created_at: new Date(),
        text: toAlert(crawler.doc, crawler.diff).join("\n"),
      }));

      for (let alert of alerts) {
        tx.set(
          admin.firestore().collection(COLLECTION_ALERT).doc(alert.id),
          alert
        );
      }
    }

    return { crawler, alerts };
  });
}

export function diff(prev: IDocument, next: IDocument): IDocumentDiff {
  const diff: IDocumentDiff = { ts: new Date() };

  if (!prev.score) prev.score = 0;
  if (!next.score) next.score = 0;
  if (prev.score !== next.score) {
    diff.score_prev = prev.score;
    diff.score_next = next.score;
    diff.score = next.score - prev.score;
  }

  if (!prev.descendants) prev.descendants = 0;
  if (!next.descendants) next.descendants = 0;
  if (prev.descendants !== next.descendants) {
    diff.descendants_prev = prev.descendants;
    diff.descendants_next = next.descendants;
    diff.descendants = next.descendants - prev.descendants;
  }

  return diff;
}

export function hasDiff(diff: IDocumentDiff): boolean {
  if (typeof diff.score === "number") return true;
  if (typeof diff.descendants === "number") return true;
  return false;
}

export function toAlert(doc: IDocument, diff?: IDocumentDiff): string[] {
  const messages: string[] = [
    `🚨 [${doc.id}](https://news.ycombinator.com/item?id=${doc.id}) has been updated.🚨\n`,
  ];

  const emoji = type2emoji(doc.type);
  messages.push(`${emoji} *Type*: ${doc.type}`);
  if (doc.title) messages.push(`📝 *Title:* ${doc.title}`);

  messages.push("------------------------------");

  if (diff?.score) {
    messages.push(
      `⭐️ *Score:* ${diff.score_prev} # ${diff.score_next} -> *${diff.score}*`
    );
  }
  if (diff?.descendants) {
    messages.push(
      `💬 *Comments:* ${diff.descendants_prev} # ${diff.descendants_next} -> *${diff.descendants}*`
    );
  }

  return messages;
}
