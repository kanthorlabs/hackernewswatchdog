require("dotenv").config();
const Telegram = require("telegraf").Telegraf;

main()
  .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
  .catch(console.error);

async function main() {
  if (!process.env.BOTS_AUTHENTICATION_TOKEN)
    throw new Error("BOTS_AUTHENTICATION_TOKEN is required");
  if (!process.env.BOTS_TELEGRAM_TOKEN)
    throw new Error("BOTS_TELEGRAM_TOKEN is required");
  if (!process.env.BOTS_TELEGRAM_WEBHOOK_URL)
    throw new Error("BOTS_TELEGRAM_WEBHOOK_URL is required");

  const bot = new Telegram(process.env.BOTS_TELEGRAM_TOKEN);
  const webhookUrl = new URL(process.env.BOTS_TELEGRAM_WEBHOOK_URL);
  webhookUrl.searchParams.set(
    "authorization",
    process.env.BOTS_AUTHENTICATION_TOKEN
  );

  const ok = await bot.telegram.setWebhook(webhookUrl.toString());
  if (!ok) throw new Error("unable to set webhook");

  const webhook = await bot.telegram.getWebhookInfo();
  // remove sensitive data
  const url = new URL(webhook.url);
  url.searchParams.set(
    "authorization",
    new Array(process.env.BOTS_AUTHENTICATION_TOKEN.length).fill("*").join("")
  );
  webhook.url = url.toString();
  console.log(JSON.stringify(webhook, null, 2));
}
