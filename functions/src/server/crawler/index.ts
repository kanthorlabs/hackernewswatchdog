import { Router } from "express";
import * as admin from "firebase-admin";
import * as database from "../../database";
import * as hackernews from "../../hackernews";
import * as utils from "../../utils";

const router = Router();

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
  const track = await hackernews.track(crawler.id).catch(utils.catcher);
  if (!track) {
    return res.status(404).json({ error: `unable to track ${crawler.id}` });
  }

  return res.json(track);
});

export default router;
