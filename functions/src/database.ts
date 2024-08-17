export const COLLECTION_USER = "user";
export const COLLECTION_WATCHLIST = "watchlist";
export const COLLECTION_CRAWLER = "crawler";

export interface IUser {
  id: string;
  name: string;
  username: string;
}

export enum DocumentType {
  Story = "story",
  Comment = "comment",
  Job = "job",
  Poll = "poll",
  PollOpt = "pollopt",
}

export interface IDocument {
  type: DocumentType;
  id: number;
  by: string;
  parent: number;
  kids?: number[];
  time: number;
  text: string;
  title?: string;
}

export interface ICrawler {
  id: number;
  created_at: number;
  schedule_at: number;
  watch_by: string[];
}
