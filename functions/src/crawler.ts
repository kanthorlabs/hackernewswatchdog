import admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { ParamsOf } from "firebase-functions/lib/common/params";
import {
  DocumentSnapshot,
  FirestoreEvent,
  Change,
} from "firebase-functions/v2/firestore";
import { ScheduledEvent } from "firebase-functions/v2/scheduler";
import _ from "lodash";
import {
  COLLECTION_SYSTEM,
  COLLECTION_CRAWLER,
  COLLECTION_CRAWLER_TASK,
  ICrawler,
  ICrawlerTask,
  SystemKey,
  ISystemCrawler,
  COLLECTION_ALERT,
} from "./database";
import * as utils from "./utils";
import * as hackernews from "./hackernews";
import config from "./config";

export async function scan(from: number, to: number, size: number) {
  return admin.firestore().runTransaction(async (tx) => {
    const ref = admin
      .firestore()
      .collection(COLLECTION_CRAWLER)
      .where("schedule_id", ">", from)
      .where("schedule_id", "<=", to)
      .orderBy("schedule_id", "asc")
      .limit(size);
    const r = await tx.get(ref);
    // no more task, return right cursor
    if (r.empty) return { cursor: to, count: 0 };

    let cursor = 0;
    // countinue scanning
    for (let doc of r.docs) {
      const crawler = doc.data() as ICrawler;
      // update cursor to be last doc
      cursor = crawler.schedule_id;

      const r = await hackernews.track(crawler).catch(utils.catcher);
      if (!r) {
        logger.error(`unable to get doc ${crawler.doc_id}`);
        continue;
      }
      for (let alert of r.alerts) {
        tx.set(
          admin.firestore().collection(COLLECTION_ALERT).doc(alert.id),
          alert
        );
      }
      tx.set(doc.ref, r.crawler, { merge: true });
    }

    return { cursor, count: r.docs.length };
  });
}

export function onTaskWritten<Document extends string>() {
  return async function taskWritten(
    event: FirestoreEvent<
      Change<DocumentSnapshot> | undefined,
      ParamsOf<Document>
    >
  ) {
    const task = event.data?.after.data() as ICrawlerTask | undefined;
    if (!task) {
      logger.error(`[${event.type}] task ${event.params.task_id} is deleted`);
      return;
    }

    // IMPORTANT: breaking the recursion
    if (task.finalized_at > 0) {
      const finalized = new Date(task.finalized_at).toISOString();
      logger.info(`task ${event.params.task_id} is finalized at ${finalized}`);
      return;
    }

    const r = await scan(task.from, task.to, task.size).catch((error) => {
      logger.error(`${error.message} | ${JSON.stringify(task)}`);
      task.error = error.message;
      return { cursor: 0, count: 0 };
    });
    task.item_count += r.count;
    // move left cursor to next value
    if (Boolean(r.cursor) && r.cursor < task.to) {
      task.from = r.cursor;
    } else {
      // got error or no more task
      task.finalized_at = Date.now();
    }

    await admin
      .firestore()
      .collection(COLLECTION_CRAWLER_TASK)
      .doc(event.params.task_id)
      .set(task, { merge: true });
  };
}

export function useSchedule() {
  return async function schedule(event: ScheduledEvent) {
    logger.debug("scheduled at", event.scheduleTime);

    return admin.firestore().runTransaction(async (tx) => {
      const active = await tx.get(
        admin
          .firestore()
          .collection(COLLECTION_CRAWLER_TASK)
          .where("finalized_at", "==", 0)
      );
      if (!active.empty) {
        logger.warn(`there are ${active.size} active tasks`);
        return;
      }

      let system = await tx
        .get(
          admin.firestore().collection(COLLECTION_SYSTEM).doc(SystemKey.Crawler)
        )
        .then((s) => s.data() as ISystemCrawler);
      if (!system) {
        system = { to: new Date(2024, 1, 1).getTime() };
      }

      const from = system.to;
      const to = Date.now();

      const task: ICrawlerTask = {
        id: [from, to, config.crawler.schedule_size].map(String).join("_"),
        from,
        to,
        size: config.crawler.schedule_size,
        created_at: Date.now(),
        finalized_at: 0,
        item_count: 0,
        error: "",
      };
      tx.set(
        admin.firestore().collection(COLLECTION_CRAWLER_TASK).doc(task.id),
        task
      );

      system.to = task.to;
      tx.set(
        admin.firestore().collection(COLLECTION_SYSTEM).doc(SystemKey.Crawler),
        system
      );
    });
  };
}
