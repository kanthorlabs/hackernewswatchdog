import { Telegraf } from "telegraf";
import * as logger from "firebase-functions/logger";
import { User as TelegrafUser } from "telegraf/types";
import _ from "lodash";
import * as deployment from "../deployment";
import * as database from "../database";
import * as hackernews from "../hackernews";
import * as utils from "../utils";
import config from "../config";

const bot = new Telegraf(deployment.BOTS_TELEGRAM_TOKEN);
const MESSAGES = {
  START: [
    "🌟 Welcome to the *Hacker News WatchDog Bot*! 🐾\n",
    "🔔 Stay on top of the latest discussions with real-time notifications whenever new comments are posted on your favorite Hacker News threads.",
    "💬 Type /help to explore all the available commands and features!",
  ],
  HELP: [
    `✨ *Hacker News WatchDog Bot - Commands* ✨\n`,
    `Here’s what you can do:`,
    `👁️ /watch - Start watching a specific thread or comment for new replies.`,
    `🚫 /unwatch - Stop watching a thread or comment.`,
    `🔍 /list - Show the list of threads or comments you're currently watching.`,
  ],
};

bot.use((ctx, next) => {
  if (
    !ctx.chat?.type ||
    !config.limits.bot_enabled_chat_types.includes(ctx.chat.type)
  ) {
    return ctx.reply(
      `🚫 *This command is only available in [${config.limits.bot_enabled_chat_types}] chat.* Please send me a message directly to use it.`
    );
  }
  return next();
});

bot.start(async (ctx) => {
  await ctx.reply(
    MESSAGES.START.join("\n") + "\n\n---------\n\n" + MESSAGES.HELP.join("\n"),
    {
      parse_mode: "Markdown",
    }
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(MESSAGES.HELP.join("\n"), { parse_mode: "Markdown" });
});

bot.command("watch", async (ctx) => {
  const id = hackernews.parse(ctx.message.text);
  if (!id) {
    await ctx.reply("⚠️ We could not parse the id of the thread or comment.");
    return;
  }
  const doc = await hackernews.get(id).catch(utils.catcher);
  if (!doc) {
    await ctx.reply("⚠️ We could not find the thread or comment.");
    return;
  }
  const user = toUser(ctx.message.from);

  const err = await hackernews
    .watch(user, doc)
    .then(() => "")
    .catch((err) => {
      if (err.message.startsWith("ERROR:")) {
        return err.message.replace("ERROR: ", "");
      }
      return "Unknown error occurred.";
    });
  if (!!err) {
    await ctx.reply(
      [
        "⚠️ We could not start watching this thread or comment because of the following error:",
        "---------",
        err,
      ].join("\n"),
      { parse_mode: "Markdown" }
    );
    return;
  }

  const messages = [
    `🔔 You are now watching a *${_.startCase(doc.type)}*\n`,
    ...hackernews.toView(doc),
  ];
  try {
    await ctx.reply(messages.join("\n"), { parse_mode: "Markdown" });
  } catch (err: any) {
    await ctx.reply(
      `We were unable to produce messages for you due to invalid characters.`
    );
    logger.error(`${err.message} | ${messages.join("\n")}`);
  }
});

bot.command("unwatch", async (ctx) => {
  const id = hackernews.parse(ctx.message.text);
  if (!id) {
    await ctx.reply("⚠️ We could not parse the id of the thread or comment.");
    return;
  }
  const doc = await hackernews.get(id).catch(utils.catcher);
  if (!doc) {
    await ctx.reply("⚠️ We could not find the thread or comment.");
    return;
  }
  const user = toUser(ctx.message.from);

  const ok = await hackernews
    .unwatch(user, doc)
    .then(() => true)
    .catch(utils.catcher);
  if (!ok) {
    await ctx.reply("⚠️ We could not stop watching this thread or comment.");
    return;
  }

  const messages = [
    `🚫 You have stopped watching the following *${_.startCase(doc.type)}*\n`,
    ...hackernews.toView(doc),
  ];
  await ctx.reply(messages.join("\n"), { parse_mode: "Markdown" });
});

bot.command("list", async (ctx) => {
  const user = toUser(ctx.message.from);

  const docs: database.IDocument[] | null = await hackernews
    .list(user)
    .catch(utils.catcher);
  if (!docs) {
    await ctx.reply(
      "⚠️ We could not get the list of threads or comments you're watching."
    );
    return;
  }

  if (docs.length === 0) {
    await ctx.reply("🔍 You are not watching any threads or comments.");
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
    `📈 Count: ${docs.length} items`,
  ];

  try {
    await ctx.reply(messages.join("\n---------\n"), { parse_mode: "Markdown" });
  } catch (err: any) {
    await ctx.reply(
      `We found ${docs.length} but were unable to produce messages for you due to invalid characters.`
    );
    logger.error(`${err.message} | ${messages.join("\n")}`);
  }
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
