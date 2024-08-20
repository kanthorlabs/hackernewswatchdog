import "dotenv/config";
import admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

import * as deployment from "./deployment";
import * as database from "./database";
import * as server from "./server";
import * as crawler from "./crawler";
import * as alert from "./alert";
import * as statistics from "./statistics";

admin.initializeApp({
  projectId: deployment.GCLOUD_PROJECT,
  storageBucket: deployment.FIREBASE_STORAGE_BUCKET,
});
admin.firestore().settings({ ignoreUndefinedProperties: true });

// initialize database
admin.firestore().runTransaction(async (tx) => {
  const ref = admin
    .firestore()
    .collection(database.COLLECTION_SYSTEM)
    .doc(database.SystemKey.Statistics);
  const statistics = await tx.get(ref);
  if (statistics.exists) return;

  logger.debug("initializing statistics");
  tx.set(ref, {
    user_count: 0,
    crawler_count: 0,
    alert_count: 0,
    crawler_task_count: 0,
  } as database.IStatistics);
});

export const api = onRequest(
  { region: deployment.FIREBASE_REGION },
  server.create()
);

export const scheduleAlertSending = onSchedule(
  {
    region: deployment.FIREBASE_REGION,
    schedule: "*/5 * * * *",
    retryCount: 0,
    concurrency: 1,
  },
  alert.useSchedule()
);

export const scheduleCrawlerTask = onSchedule(
  {
    region: deployment.FIREBASE_REGION,
    schedule: "*/5 * * * *",
    retryCount: 0,
    concurrency: 1,
  },
  crawler.useSchedule()
);

export const onCrawlerTaskWritten = onDocumentWritten(
  {
    region: deployment.FIREBASE_REGION,
    document: `${database.COLLECTION_CRAWLER_TASK}/{task_id}`,
  },
  crawler.onTaskWritten()
);

export const onStatisticsUserWritten = onDocumentWritten(
  {
    region: deployment.FIREBASE_REGION,
    document: `${database.COLLECTION_USER}/{user_id}`,
  },
  statistics.onUserWritten()
);

export const onStatisticsCrawlerWritten = onDocumentWritten(
  {
    region: deployment.FIREBASE_REGION,
    document: `${database.COLLECTION_CRAWLER}/{crawler_id}`,
  },
  statistics.onCrawlerWritten()
);

export const onStatisticsAlertWritten = onDocumentWritten(
  {
    region: deployment.FIREBASE_REGION,
    document: `${database.COLLECTION_ALERT}/{alert_id}`,
  },
  statistics.onAlertWritten()
);

export const onStatisticsCrawlerTaskWritten = onDocumentWritten(
  {
    region: deployment.FIREBASE_REGION,
    document: `${database.COLLECTION_CRAWLER_TASK}/{task_id}`,
  },
  statistics.onCrawlerTaskWritten()
);
