import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { ParamsOf } from "firebase-functions/lib/common/params";
import {
  QueryDocumentSnapshot,
  FirestoreEvent,
} from "firebase-functions/v2/firestore";

import { ulid } from "ulid";
import {
  COLLECTION_CRAWLER,
  COLLECTION_CRAWLER_TASK,
  ICrawler,
  ICrawlerTask,
} from "./database";
import * as utils from "./utils";
import config from "./config";
import * as hackernews from "./hackernews";

export async function scan(from: number, to: number): Promise<ICrawlerTask[]> {
  return admin.firestore().runTransaction(async (tx) => {
    const ref = admin
      .firestore()
      .collection(COLLECTION_CRAWLER)
      .where("schedule_at", ">=", from)
      .where("schedule_at", "<=", to)
      .orderBy("schedule_at");
    const docs = await tx.get(ref);
    if (docs.empty) return [];

    const tasks: ICrawlerTask[] = [];
    docs.forEach((doc) => {
      const crawler = doc.data() as ICrawler;
      const backsoff = utils.backsoff(
        crawler.schedule_attempts + 1,
        config.crawler.factor,
        config.crawler.random_percentage
      );
      const updates: Partial<ICrawler> = {
        schedule_at: crawler.schedule_at + config.crawler.delay + backsoff,
        schedule_attempts: crawler.schedule_attempts + 1,
      };
      tx.update(doc.ref, updates);
      const at = new Date(updates.schedule_at as number).toISOString();
      logger.debug(`crawler scheduled ${doc.id} at ${at}`);

      const task: ICrawlerTask = {
        id: ulid(),
        doc_id: crawler.doc_id,
        created_at: new Date(),
      };
      tx.set(
        admin.firestore().collection(COLLECTION_CRAWLER_TASK).doc(task.id),
        task
      );

      tasks.push(task);
    });

    return tasks;
  });
}

export function onTaskCreated<Document extends string>() {
  return async function taskCreated(
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) {
    const task = event.data?.data() as ICrawlerTask | undefined;
    if (!task) {
      logger.error("crawler task is not found", JSON.stringify(event.params));
      return;
    }

    const result = await hackernews
      .track(task.doc_id)
      .catch((error) => ({ error }));
    await admin
      .firestore()
      .collection(COLLECTION_CRAWLER_TASK)
      .doc(task.id)
      .update({ result });
  };
}
