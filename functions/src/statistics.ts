import admin from "firebase-admin";
import { ParamsOf } from "firebase-functions/lib/common/params";
import {
  DocumentSnapshot,
  FirestoreEvent,
  Change,
} from "firebase-functions/v2/firestore";
import _ from "lodash";
import { COLLECTION_SYSTEM, SystemKey } from "./database";

export function onUserWritten<Document extends string>() {
  return async function userWritten(
    event: FirestoreEvent<
      Change<DocumentSnapshot> | undefined,
      ParamsOf<Document>
    >
  ) {
    let change = 0;
    // If the document does not exist, it was deleted
    if (!event.data?.after.data()) change = -1;
    // If the document does not exist, it's a creation
    if (!event.data?.before.data()) change = 1;

    if (change === 0) return;

    await admin
      .firestore()
      .collection(COLLECTION_SYSTEM)
      .doc(SystemKey.Statistics)
      .update({
        user_count: admin.firestore.FieldValue.increment(change),
      });
  };
}

export function onCrawlerWritten<Document extends string>() {
  return async function userWritten(
    event: FirestoreEvent<
      Change<DocumentSnapshot> | undefined,
      ParamsOf<Document>
    >
  ) {
    let change = 0;
    // If the document does not exist, it was deleted
    if (!event.data?.after.data()) change = -1;
    // If the document does not exist, it's a creation
    if (!event.data?.before.data()) change = 1;

    if (change === 0) return;

    await admin
      .firestore()
      .collection(COLLECTION_SYSTEM)
      .doc(SystemKey.Statistics)
      .update({
        crawler_count: admin.firestore.FieldValue.increment(change),
      });
  };
}

export function onCrawlerTaskWritten<Document extends string>() {
  return async function userWritten(
    event: FirestoreEvent<
      Change<DocumentSnapshot> | undefined,
      ParamsOf<Document>
    >
  ) {
    let change = 0;
    // If the document does not exist, it was deleted
    if (!event.data?.after.data()) change = -1;
    // If the document does not exist, it's a creation
    if (!event.data?.before.data()) change = 1;

    if (change === 0) return;

    await admin
      .firestore()
      .collection(COLLECTION_SYSTEM)
      .doc(SystemKey.Statistics)
      .update({
        crawler_task_count: admin.firestore.FieldValue.increment(change),
      });
  };
}

export function onAlertWritten<Document extends string>() {
  return async function userWritten(
    event: FirestoreEvent<
      Change<DocumentSnapshot> | undefined,
      ParamsOf<Document>
    >
  ) {
    let change = 0;
    // If the document does not exist, it was deleted
    if (!event.data?.after.data()) change = -1;
    // If the document does not exist, it's a creation
    if (!event.data?.before.data()) change = 1;

    if (change === 0) return;

    await admin
      .firestore()
      .collection(COLLECTION_SYSTEM)
      .doc(SystemKey.Statistics)
      .update({
        alert_count: admin.firestore.FieldValue.increment(change),
      });
  };
}
