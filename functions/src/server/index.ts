import * as logger from "firebase-functions/logger";
import express from "express";
import cors from "cors";
import { json } from "body-parser";
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
