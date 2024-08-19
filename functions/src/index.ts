import "dotenv/config";
import admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

import * as deployment from "./deployment";
import * as database from "./database";
import * as server from "./server";
import * as crawler from "./crawler";
import * as alert from "./alert";

admin.initializeApp({
  projectId: deployment.GCLOUD_PROJECT,
  storageBucket: deployment.FIREBASE_STORAGE_BUCKET,
});
admin.firestore().settings({ ignoreUndefinedProperties: true });

export const api = onRequest(
  { region: deployment.FIREBASE_REGION },
  server.create()
);

export const scheduleAlertSending = onSchedule(
  {
    region: deployment.FIREBASE_REGION,
    schedule: "*/5 * * * *",
  },
  alert.useSchedule()
);

export const onCrawlerTaskWritten = onDocumentWritten(
  {
    region: deployment.FIREBASE_REGION,
    document: `${database.COLLECTION_CRAWLER_TASK}/{task_id}`,
  },
  crawler.onTaskWritten()
);
