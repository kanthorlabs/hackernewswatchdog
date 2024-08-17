import fetch from "node-fetch";
import * as deployment from "./deployment";
import { IDocument } from "./types";

export function parse(text: string): string {
  // number
  const num = text.match(/\/(watch|unwatch) (\d+)/);
  if (num && num[1]) return num[2];

  const url = text.match(/[?&]id=(\d+)/);
  if (url && url[1]) return url[1];

  return "";
}

export async function get(id: string): Promise<IDocument> {
  const base = new URL(deployment.HACKERNEWS_ENDPOINT);
  base.pathname = `v0/item/${id}.json`;

  const r = await fetch(base);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
  return (await r.json()) as IDocument;
}
