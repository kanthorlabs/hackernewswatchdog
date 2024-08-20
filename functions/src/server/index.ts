import * as logger from "firebase-functions/logger";
import express from "express";
import cors from "cors";
import { json } from "body-parser";
import * as deployment from "../deployment";
import webhook from "./webhook";
import crawler from "./crawler";
import alert from "./alert";

export function create() {
  const server = express();
  server.use(cors({}));
  server.use(json());

  server.get("/", (req, res) => {
    res.json({ now: new Date().toISOString() });
  });

  server.use((req, res, next) => {
    const authorization =
      req.headers.authorization ||
      req.query.authorization ||
      req.headers["X-Telegram-Bot-Api-Secret-Token"];
    if (authorization !== deployment.BOTS_AUTHENTICATION_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }

    return next();
  });

  server.use("/webhook", webhook);
  server.use("/crawler", crawler);
  server.use("/alert", alert);

  server.use((req, res) => {
    logger.error("404", req.path);
    res.status(404).json({ error: "not found" });
  });

  logger.debug("initialized server");
  return server;
}
