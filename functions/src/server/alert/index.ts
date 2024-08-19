import { Router } from "express";
import admin from "firebase-admin";
import bot from "../../bots/telegram";
import * as database from "../../database";
import * as utils from "../../utils";

const router = Router();

router.param("alert_id", async function alert(req, res, next, id) {
  const alert = await admin
    .firestore()
    .collection(database.COLLECTION_ALERT)
    .doc(id)
    .get()
    .then((s) => s.data() as any)
    .catch(utils.catcher);
  if (!alert) {
    return res.status(404).json({ error: `alert ${id} is not found` });
  }

  res.locals.alert = alert;
  return next();
});

router.get("/:alert_id", async function get(req, res) {
  const alert: database.IAlert = res.locals.alert;
  const r = await bot.telegram.sendMessage(alert.uid, alert.text, {
    parse_mode: "Markdown",
  });
  return res.json(r);
});

export default router;
