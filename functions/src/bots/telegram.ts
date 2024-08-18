import { Telegraf } from "telegraf";
import { User as TelegrafUser } from "telegraf/types";
import _ from "lodash";
import * as deployment from "../deployment";
import * as database from "../database";
import * as hackernews from "../hackernews";
import * as utils from "../utils";

const bot = new Telegraf(deployment.BOTS_TELEGRAM_TOKEN);

bot.start(async (ctx) => {
  const messages = [
    "🌟 Welcome to the *Hacker News WatchDog Bot*! 🐾",
    "🔔 Stay on top of the latest discussions with real-time notifications whenever new comments are posted on your favorite Hacker News threads.",
    "💬 Type /help to explore all the available commands and features!",
  ];

  ctx.reply(messages.join("\n"), { parse_mode: "Markdown" });
});

bot.command("help", (ctx) => {
  const messages = [
    `✨ *Hacker News WatchDog Bot - Commands* ✨\n`,
    `Here’s what you can do:\n`,
    `👁️ /watch - Start watching a specific thread or comment for new replies.`,
    `🚫 /unwatch - Stop watching a thread or comment.`,
    `🔍 /list - Show the list of threads or comments you're currently watching.`,
  ];

  ctx.reply(messages.join("\n"), { parse_mode: "Markdown" });
});

bot.command("watch", async (ctx) => {
  const id = hackernews.parse(ctx.message.text);
  if (!id) {
    ctx.reply("⚠️ We could not parse the id of the thread or comment.");
    return;
  }
  const doc = await hackernews.get(id).catch(utils.catcher);
  if (!doc) {
    ctx.reply("⚠️ We could not find the thread or comment.");
    return;
  }
  const user = toUser(ctx.message.from);

  const ok = await hackernews
    .watch(user, doc)
    .then(() => true)
    .catch(utils.catcher);
  if (!ok) {
    ctx.reply("⚠️ We could not start watching this thread or comment.");
    return;
  }

  const messages = [
    `🔔 You are now watching a *${_.startCase(doc.type)}*\n`,
    ...hackernews.toView(doc),
  ];
  ctx.reply(messages.join("\n"), { parse_mode: "Markdown" });
});

bot.command("unwatch", async (ctx) => {
  const id = hackernews.parse(ctx.message.text);
  if (!id) {
    ctx.reply("⚠️ We could not parse the id of the thread or comment.");
    return;
  }
  const doc = await hackernews.get(id).catch(utils.catcher);
  if (!doc) {
    ctx.reply("⚠️ We could not find the thread or comment.");
    return;
  }
  const user = toUser(ctx.message.from);

  const ok = await hackernews
    .unwatch(user, doc)
    .then(() => true)
    .catch(utils.catcher);
  if (!ok) {
    ctx.reply("⚠️ We could not stop watching this thread or comment.");
    return;
  }

  const messages = [
    `🚫 You have stopped watching the following *${_.startCase(doc.type)}*\n`,
    ...hackernews.toView(doc),
  ];
  ctx.reply(messages.join("\n"), { parse_mode: "Markdown" });
});

bot.command("list", async (ctx) => {
  const user = toUser(ctx.message.from);

  const docs: database.IDocument[] | null = await hackernews
    .list(user)
    .catch(utils.catcher);
  if (!docs) {
    ctx.reply(
      "⚠️ We could not get the list of threads or comments you're watching."
    );
    return;
  }

  if (docs.length === 0) {
    ctx.reply("🔍 You are not watching any threads or comments.");
    return;
  }

  // sort by time ascending because in Telegram App,
  // if the list is too long, the last item you can see is the latest one
  const lines = _.sortBy(docs, "time").map((d, i) =>
    hackernews.toView(d, i + 1).join("\n")
  );
  const messages = [
    "🔍 You are currently watching the following threads or comments:",
    ...lines,
  ];
  ctx.reply(messages.join("\n---------\n"), { parse_mode: "Markdown" });
});

export default bot;

function toUser(from: TelegrafUser): database.IUser {
  return {
    id: String(from.id),
    name: [from.first_name, from.last_name].filter(Boolean).join(" "),
    username: from.username || "",
    watch_list: [],
  };
}
