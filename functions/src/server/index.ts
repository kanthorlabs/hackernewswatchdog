import * as logger from "firebase-functions/logger";
import express from "express";
import cors from "cors";
import { json } from "body-parser";
import * as webhook from "./webhook";

export function create() {
  const server = express();
  server.use(cors({}));
  server.use(json());

  server.get("/", (req, res) => {
    res.json({ now: new Date().toISOString() });
  });

  server.post("/webhook/telegram", webhook.telegram.use());

  server.use((req, res) => {
    logger.error("404", req.path);
    res.status(404).json({ error: "not found" });
  });

  logger.debug("initialized server");
  return server;
}
