import * as logger from "firebase-functions/logger";
import * as deployment from "../../deployment";
import { IGatewayHandler } from "../../types";
import bot from "../../bots/telegram";

export function use(): IGatewayHandler {
  return async function telegram(req, res) {
    const authorization =
      req.headers.authorization ||
      req.query.authorization ||
      req.headers["X-Telegram-Bot-Api-Secret-Token"];
    if (authorization !== deployment.BOTS_AUTHENTICATION_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }

    logger.debug("body", JSON.stringify(req.body));

    await bot.handleUpdate(req.body, res);
    if (!res.writableEnded) return res.end();
    return Promise.resolve(res);
  };
}
