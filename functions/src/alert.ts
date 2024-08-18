import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { ParamsOf } from "firebase-functions/lib/common/params";
import {
  QueryDocumentSnapshot,
  FirestoreEvent,
} from "firebase-functions/v2/firestore";
import { COLLECTION_ALERT, IAlert } from "./database";
import bot from "./bots/telegram";

export async function send(alert: IAlert) {
  return bot.telegram.sendMessage(alert.uid, alert.text, {
    parse_mode: "Markdown",
  });
}

export function onCreated<Document extends string>() {
  return async function taskCreated(
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) {
    const alert = event.data?.data() as IAlert | undefined;
    if (!alert) {
      logger.error("crawler task is not found", JSON.stringify(event.params));
      return;
    }
    const result = await send(alert).catch((error) => ({ error }));
    await admin
      .firestore()
      .collection(COLLECTION_ALERT)
      .doc(alert.id)
      .update({ result });
  };
}
