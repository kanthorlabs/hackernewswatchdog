import { Router } from "express";
import admin from "firebase-admin";
import _ from "lodash";
import * as database from "../../database";
import * as hackernews from "../../hackernews";
import * as crawler from "../../crawler";
import * as utils from "../../utils";

const router = Router();

router.get("/scanner", async function get(req, res) {
  const from =
    String(req.query.from || "") ||
    utils.getScheduleIdFromtime(Date.now() - 3600 * 1000);
  const to =
    String(req.query.to || "") || utils.getScheduleIdFromtime(Date.now());
  const size = Number(req.query.size || 1000);

  const next = await crawler.scan(from, to, size).catch(utils.catcher);
  if (_.isNull(next)) return res.status(500).json({ error: "unable to scan" });
  return res.json({ from, to, next });
});

router.param("crawler_id", async function crawler(req, res, next, id) {
  const crawler = await admin
    .firestore()
    .collection(database.COLLECTION_CRAWLER)
    .doc(id)
    .get()
    .then((s) => s.data() as any)
    .catch(utils.catcher);
  if (!crawler) {
    return res.status(404).json({ error: `crawler ${id} is not found` });
  }

  res.locals.crawler = crawler;
  return next();
});

router.get("/:crawler_id", async function get(req, res) {
  const crawler: database.ICrawler = res.locals.crawler;
  const track = await hackernews.track(crawler).catch(utils.catcher);
  if (!track) {
    return res.status(404).json({ error: `unable to track ${crawler.doc_id}` });
  }

  return res.json(track);
});

export default router;
