import admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { ScheduledEvent } from "firebase-functions/v2/scheduler";
import { COLLECTION_ALERT, IAlert } from "./database";
import bot from "./bots/telegram";
import config from "./config";

export async function send(alert: IAlert) {
  return bot.telegram.sendMessage(alert.uid, alert.text, {
    parse_mode: "Markdown",
  });
}

export function useSchedule() {
  return async function schedule(event: ScheduledEvent) {
    logger.debug("scheduled at", event.scheduleTime);

    const alerts = await admin
      .firestore()
      .collection(COLLECTION_ALERT)
      .where("delivered_at", "==", 0)
      .limit(config.alert.schedule_size)
      .get();
    if (alerts.empty) {
      return;
    }

    const docs = alerts.docs.map((doc) => doc.data() as IAlert);
    const promises = docs.map((d) =>
      send(d).catch((error) => ({ error: error.message }))
    );
    const results = await Promise.all(promises);

    const batch = admin.firestore().batch();
    docs.forEach((d, i) => {
      const ref = admin.firestore().collection(COLLECTION_ALERT).doc(d.id);
      batch.update(ref, { delivered_at: Date.now(), result: results[i] });
    });
    await batch.commit();

    logger.info(`sent ${results.length} alerts`);
  };
}
