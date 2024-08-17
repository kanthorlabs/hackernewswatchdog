import "dotenv/config";
import admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import * as deployment from "./deployment";
import * as server from "./server";

admin.initializeApp({
  projectId: deployment.GCLOUD_PROJECT,
  storageBucket: deployment.FIREBASE_STORAGE_BUCKET,
});
admin.firestore().settings({ ignoreUndefinedProperties: true });

export const api = onRequest(
  { region: deployment.FIREBASE_REGION },
  server.create()
);
