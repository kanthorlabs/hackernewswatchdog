import fetch from "node-fetch";
import * as admin from "firebase-admin";
import _ from "lodash";
import * as deployment from "./deployment";
import {
  COLLECTION_CRAWLER,
  COLLECTION_USER,
  COLLECTION_WATCHLIST,
  ICrawler,
  IDocument,
  IUser,
} from "./database";
import config from "./config";

export function parse(text: string): string {
  // number
  const num = text.match(/\/(watch|unwatch) (\d+)/);
  if (num && num[1]) return num[2];

  const url = text.match(/[?&]id=(\d+)/);
  if (url && url[1]) return url[1];

  return "";
}

export async function get(id: string): Promise<IDocument> {
  const base = new URL(deployment.HACKERNEWS_ENDPOINT);
  base.pathname = `v0/item/${id}.json`;

  const r = await fetch(base);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
  return (await r.json()) as IDocument;
}

export function toView(doc: IDocument, counter?: number): string[] {
  const time = new Date(doc.time * 1000).toISOString(); // Convert Unix timestamp to human-readable format
  const messages: string[] = [];

  if (counter) messages.push(`🗳️ #${counter} - *${_.startCase(doc.type)}*`);
  if (doc.title) messages.push(`📖 *Title:* ${doc.title}`);
  messages.push(`🆔 *ID:* ${doc.id}`);
  messages.push(`👤 *Author:* ${doc.by}`);
  messages.push(`🕒 *Posted at:* ${time}`);

  return messages;
}

export async function watch(doc: IDocument, user: IUser) {
  return admin.firestore().runTransaction(async (tx) => {
    await enqueue(doc, user, tx);

    const userRef = admin.firestore().collection(COLLECTION_USER).doc(user.id);
    tx.set(userRef, user, { merge: true });

    const docRef = userRef.collection(COLLECTION_WATCHLIST).doc(String(doc.id));
    tx.set(docRef, doc, { merge: true });
  });
}

export async function enqueue(
  doc: IDocument,
  user: IUser,
  tx: admin.firestore.Transaction
) {
  const ids = [doc.id].concat(doc.kids || []);
  for (let id of ids) {
    const crawlerRef = admin
      .firestore()
      .collection(COLLECTION_CRAWLER)
      .doc(String(id));
    let crawler = await crawlerRef.get().then((s) => s.data() as ICrawler);
    if (!crawler) {
      crawler = {
        id: id,
        created_at: new Date().getTime(),
        schedule_at: new Date().getTime() + config.crawler.init_delay,
        watch_by: [],
      };
    }
    if (!crawler.watch_by.includes(user.id)) {
      crawler.watch_by.push(user.id);
    }
    tx.set(crawlerRef, crawler, { merge: true });
  }
}

export async function unwatch(doc: IDocument, uid: string) {
  return admin.firestore().runTransaction(async (tx) => {
    const crawlerRef = admin
      .firestore()
      .collection(COLLECTION_CRAWLER)
      .doc(String(doc.id));
    let crawler = await crawlerRef.get().then((s) => s.data() as ICrawler);
    if (crawler) {
      if (crawler.watch_by.includes(uid)) {
        crawler.watch_by = crawler.watch_by.filter((id) => id !== uid);
      }

      if (crawler.watch_by.length === 0) {
        // if no one is watching, disable the crawler
        crawler.schedule_at = -1;
      }
      tx.set(crawlerRef, crawler, { merge: true });
    }

    const userRef = admin.firestore().collection(COLLECTION_USER).doc(uid);

    const docRef = userRef.collection(COLLECTION_WATCHLIST).doc(String(doc.id));
    tx.delete(docRef);
  });
}

export async function list(uid: string) {
  const docs: IDocument[] = await admin
    .firestore()
    .collection(COLLECTION_USER)
    .doc(uid)
    .collection(COLLECTION_WATCHLIST)
    .get()
    .then((s) => s.docs.map((d) => d.data() as IDocument));
  return docs;
}
