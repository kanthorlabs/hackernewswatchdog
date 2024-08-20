import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import * as logger from "firebase-functions/logger";
import { User as TelegrafUser } from "telegraf/types";
import _ from "lodash";
import admin from "firebase-admin";
import prettyms from "pretty-ms";
import * as deployment from "../deployment";
import * as database from "../database";
import * as hackernews from "../hackernews";
import * as utils from "../utils";
import config from "../config";

const bot = new Telegraf(deployment.BOTS_TELEGRAM_TOKEN);
const MESSAGES = {
  START: [
    "🌟 Welcome to the *Hacker News WatchDog Bot*! 🐾\n",
    "🔔 Stay on top of the latest discussions with timely notifications whenever new comments are posted on your favorite Hacker News threads.",
    "💬 Type /help to explore all the available commands and features!",
  ],
  HELP: [
    `✨ *Hacker News WatchDog Bot - Commands* ✨\n`,
    `Here’s what you can do:`,
    `👁️ /watch - Start watching a specific thread or comment for new replies.`,
    `🚫 /unwatch - Stop watching a thread or comment.`,
    `🚫 /unwatchall - Stop watching all threads or comments you are currently watching.`,
    `🔍 /list - Show the list of threads or comments you're currently watching.`,
    `🔍 /update - Get updates on all threads or comments if there have been any changes.`,
    `💡 Example:`,
    `- Use a link: \`/watch https://news.ycombinator.com/item?id=41284703\``,
    `- Use a ID: \`/watch 41284703\``,
  ],
};

bot.use((ctx, next) => {
  if (
    !ctx.chat?.type ||
    !config.limits.bot_enabled_chat_types.includes(ctx.chat.type)
  ) {
    return ctx.replyWithMarkdown(
      `🚫 *This command is only available in [${config.limits.bot_enabled_chat_types}] chat.* Please send me a message directly to use it.`
    );
  }
  return next();
});

bot.start(async (ctx) => {
  await ctx.replyWithMarkdown(
    MESSAGES.START.join("\n") + "\n---------\n" + MESSAGES.HELP.join("\n")
  );
});

bot.command("help", async (ctx) => {
  await ctx.replyWithMarkdown(MESSAGES.HELP.join("\n"));
});

bot.command("watch", async (ctx) => {
  const id = hackernews.parse(ctx.message.text);
  if (!id) {
    await ctx.replyWithMarkdown(
      "⚠️ We could not parse the id of the thread or comment."
    );
    return;
  }
  const doc = await hackernews.get(id).catch(utils.catcher);
  if (!doc) {
    await ctx.replyWithMarkdown("⚠️ We could not find the thread or comment.");
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
    await ctx.replyWithMarkdown(
      [
        "⚠️ We could not start watching this thread or comment because of the following error:",
        "---------",
        err,
      ].join("\n")
    );
    return;
  }

  const messages = [
    `🔔 You are now watching a *${_.startCase(doc.type)}*`,
    "---------",
    ...hackernews.toView(doc),
  ];
  try {
    await ctx.replyWithMarkdown(messages.join("\n"));
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
  await ctx.replyWithMarkdown(messages.join("\n"));
});

bot.command("list", async (ctx) => {
  const user = toUser(ctx.message.from);

  const docs: database.IDocument[] | null = await hackernews
    .list(user)
    .then((docs) => docs.map((d) => d.doc))
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
    await ctx.replyWithMarkdown(messages.join("\n---------\n"));
  } catch (err: any) {
    await ctx.replyWithMarkdown(
      `We found ${docs.length} but were unable to produce messages for you due to invalid characters.`
    );
    logger.error(`${err.message} | ${messages.join("\n")}`);
  }
});

bot.command("update", async (ctx) => {
  const user = toUser(ctx.message.from);
  const waitfor = await ratelimit(
    user,
    "update",
    Date.now() + config.limits.command_ratelimit.update
  );
  if (waitfor < 0) {
    await ctx.replyWithMarkdown(
      `🚫 *Command Restricted*\n\n⏳ You can use this command again in *${prettyms(
        Math.abs(waitfor)
      )}*.`
    );
    return;
  }

  await ctx.reply("🔎 Getting your list of threads or comments...");

  const crawlers = await hackernews.list(user).catch(utils.catcher);
  if (!crawlers) {
    await ctx.reply(
      "⚠️ We could not get the list of threads or comments you're watching."
    );
    return;
  }

  await ctx.reply(
    `🔎 Found ${crawlers.length} threads or comments you're watching.`
  );
  for (let crawler of crawlers) {
    const item = `[#${crawler.doc_id}](${hackernews.toItemLink(
      crawler.doc_id
    )})`;

    const r = await hackernews.track(crawler).catch(utils.catcher);
    if (!r) {
      await ctx.replyWithMarkdown(
        `⚠️ We could not update the thread or comment ${item}.`
      );
      return;
    }

    const alert = r.alerts.find((a) => a.uid === user.id);
    if (alert) {
      await ctx.replyWithMarkdown(alert.text);
      continue;
    }

    const messages = [
      `✅ The thread or comment ${item} is up to date.`,
      "---------",
      ...hackernews.toView(r.crawler.doc),
    ];
    await ctx.replyWithMarkdown(messages.join("\n"));
  }
});

bot.command("unwatchall", async (ctx) => {
  const user = toUser(ctx.message.from);
  const waitfor = await ratelimit(
    user,
    "unwatchall",
    Date.now() + config.limits.command_ratelimit.unwatchall
  );
  if (waitfor < 0) {
    await ctx.replyWithMarkdown(
      `🚫 *Command Restricted*\n\n⏳ You can use this command again in *${prettyms(
        Math.abs(waitfor)
      )}*.`
    );
    return;
  }

  await ctx.reply("🔎 Getting your list of threads or comments...");

  const crawlers = await hackernews.list(user).catch(utils.catcher);
  if (!crawlers) {
    await ctx.reply(
      "⚠️ We could not get the list of threads or comments you're watching."
    );
    return;
  }

  await ctx.reply(
    `🔎 Found ${crawlers.length} threads or comments you're watching. Please wait for awhile to process your request...`
  );
  for (let crawler of crawlers) {
    const ok = await hackernews
      .unwatch(user, crawler.doc)
      .then(() => true)
      .catch(utils.catcher);
    if (!ok) {
      await ctx.reply(
        `⚠️ We could not stop watching the thread or comment #${crawler.doc_id}.`
      );
      return;
    }

    const messages = [
      `🚫 You have stopped watching a *${_.startCase(crawler.doc.type)}*`,
      "---------",
      ...hackernews.toShortView(crawler.doc),
    ];
    await ctx.replyWithMarkdown(messages.join("\n"));
  }
});

bot.on(message("text"), (ctx) => {
  if (ctx.message.text.startsWith("/")) {
    ctx.replyWithMarkdown(
      "❌ Unknown command. Type /help to see the list of available commands."
    );
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

async function ratelimit(
  user: database.IUser,
  command: string,
  deadline = Date.now() + 60 * 60 * 1000
): Promise<number> {
  const s = await admin
    .firestore()
    .collection(database.COLLECTION_RATELIMIT)
    .doc(user.id)
    .get();
  if (!s.exists) {
    await admin
      .firestore()
      .collection(database.COLLECTION_RATELIMIT)
      .doc(user.id)
      .set({ [command]: deadline });
    return deadline;
  }

  const ratelimit = s.data() as database.IRatelimit;
  if (!ratelimit[command]) {
    await admin
      .firestore()
      .collection(database.COLLECTION_RATELIMIT)
      .doc(user.id)
      .update({ [command]: deadline });
    return deadline;
  }

  const diff = Date.now() - ratelimit[command];
  // set new deadline because the old one are outdate
  if (diff > 0) {
    await admin
      .firestore()
      .collection(database.COLLECTION_RATELIMIT)
      .doc(user.id)
      .update({ [command]: deadline });
    return deadline;
  }

  // not pass the old deadline yet
  return diff;
}
