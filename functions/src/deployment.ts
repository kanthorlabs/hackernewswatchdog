export const GCLOUD_PROJECT =
  process.env.GCLOUD_PROJECT || "hacker-news-watchdog";

export const FIREBASE_REGION = process.env.FIREBASE_REGION || "asia-southeast1";

export const FIREBASE_STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET || "hacker-news-watchdog.appspot.com";

if (!process.env.BOTS_AUTHENTICATION_TOKEN)
  throw new Error("BOTS_AUTHENTICATION_TOKEN is required");
export const BOTS_AUTHENTICATION_TOKEN = process.env.BOTS_AUTHENTICATION_TOKEN;

if (!process.env.BOTS_TELEGRAM_TOKEN)
  throw new Error("BOTS_TELEGRAM_TOKEN is required");
export const BOTS_TELEGRAM_TOKEN = process.env.BOTS_TELEGRAM_TOKEN;

export const HACKERNEWS_ENDPOINT =
  process.env.HACKERNEWS_ENDPOINT || "https://hacker-news.firebaseio.com";
