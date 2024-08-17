import { Telegraf } from "telegraf";
import * as admin from "firebase-admin";
import _ from "lodash";
import * as deployment from "../deployment";
import * as database from "../database";
import * as hackernews from "../hackernews";
import { IDocument, IUser } from "../types";

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
  const doc = await hackernews.get(id);

  const user: IUser = {
    id: String(ctx.message.from.id),
    name: [ctx.message.from.first_name, ctx.message.from.last_name]
      .filter(Boolean)
      .join(" "),
    username: ctx.message.from.username || "",
  };

  const batch = admin.firestore().batch();
  // upsert user
  batch.set(
    admin.firestore().collection(database.COLLECTION_USER).doc(user.id),
    user,
    { merge: true }
  );
  // upsert thread
  batch.set(
    admin
      .firestore()
      .collection(database.COLLECTION_USER)
      .doc(user.id)
      .collection(database.COLLECTION_WATCHLIST)
      .doc(String(doc.id)),
    doc,
    { merge: true }
  );
  await batch.commit();

  const messages = [
    `🔔 You are now watching a *${_.startCase(doc.type)}*\n`,
    ...format(doc),
  ];
  ctx.reply(messages.join("\n"), { parse_mode: "Markdown" });
});

bot.command("unwatch", async (ctx) => {
  const id = hackernews.parse(ctx.message.text);
  if (!id) {
    ctx.reply("⚠️ We could not parse the id of the thread or comment.");
    return;
  }
  const uid = String(ctx.message.from.id);

  const doc: IDocument | null = await admin
    .firestore()
    .collection(database.COLLECTION_USER)
    .doc(uid)
    .collection(database.COLLECTION_WATCHLIST)
    .doc(String(id))
    .get()
    .then((s) => s.data() as any);
  if (!doc) {
    ctx.reply("🔍 You didn't watch this thread or comment before.");
    return;
  }

  await admin
    .firestore()
    .collection(database.COLLECTION_USER)
    .doc(uid)
    .collection(database.COLLECTION_WATCHLIST)
    .doc(String(id))
    .delete();

  const messages = [
    `🚫 You have stopped watching the following *${_.startCase(doc.type)}*\n`,
    ...format(doc),
  ];
  ctx.reply(messages.join("\n"), { parse_mode: "Markdown" });
});

bot.command("list", async (ctx) => {
  const uid = String(ctx.message.from.id);

  const docs: IDocument[] = await admin
    .firestore()
    .collection(database.COLLECTION_USER)
    .doc(uid)
    .collection(database.COLLECTION_WATCHLIST)
    .get()
    .then((s) => s.docs.map((d) => d.data() as IDocument));
  if (docs.length === 0) {
    ctx.reply("🔍 You are not watching any threads or comments.");
    return;
  }

  // sort by time ascending because in Telegram App,
  // if the list is too long, the last item you can see is the latest one
  const lines = _.sortBy(docs, "time").map((d, i) =>
    format(d, i + 1).join("\n")
  );
  const messages = [
    "🔍 You are currently watching the following threads or comments:",
    ...lines,
  ];
  ctx.reply(messages.join("\n---------\n"), { parse_mode: "Markdown" });
});

export default bot;

function format(doc: IDocument, counter?: number): string[] {
  const time = new Date(doc.time * 1000).toISOString(); // Convert Unix timestamp to human-readable format
  const messages: string[] = [];

  if (counter) messages.push(`🗳️ #${counter} - *${_.startCase(doc.type)}*`);
  if (doc.title) messages.push(`📖 *Title:* ${doc.title}`);
  messages.push(`🆔 *ID:* ${doc.id}`);
  messages.push(`👤 *Author:* ${doc.by}`);
  messages.push(`🕒 *Posted at:* ${time}`);

  return messages;
}
