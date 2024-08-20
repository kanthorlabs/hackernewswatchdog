import { IGatewayHandler } from "../../types";
import bot from "../../bots/telegram";

export function use(): IGatewayHandler {
  return async function telegram(req, res) {
    await bot.handleUpdate(req.body, res);
    if (!res.writableEnded) return res.end();
    return Promise.resolve(res);
  };
}
