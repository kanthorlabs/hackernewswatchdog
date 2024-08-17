import { Telegraf } from "telegraf";
import * as deployment from "../deployment";

const bot = new Telegraf(deployment.BOTS_TELEGRAM_TOKEN);

bot.start(async (ctx) => {
  const messages = [
    "🌟 Welcome to the *Hacker News WatchDog Bot*! 🐾",
    "🔔 Stay on top of the latest discussions with real-time notifications whenever new comments are posted on your favorite Hacker News threads.",
    "💬 Type /help to explore all the available commands and features!",
  ];

  ctx.reply(messages.join("\n\n"), { parse_mode: "Markdown" });
});

bot.command("help", (ctx) => {
  ctx.reply(
    `✨ *Hacker News WatchDog Bot - Commands* ✨\n\n` +
      `Here’s what you can do:\n\n` +
      `🔍 /list - Show the list of threads or comments you're currently watching.\n` +
      `👁️ /watch - Start watching a specific thread or comment for new replies.\n` +
      `🚫 /unwatch - Stop watching a thread or comment.\n\n`,
    { parse_mode: "Markdown" }
  );
});

export default bot;
