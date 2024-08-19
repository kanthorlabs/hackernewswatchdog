export const COLLECTION_USER = "user";
export const COLLECTION_CRAWLER = "crawler";
export const COLLECTION_CRAWLER_TASK = "crawler_task";
export const COLLECTION_ALERT = "alert";

export interface IUser {
  id: string;
  name: string;
  username: string;
  watch_list: number[];
}

export enum DocumentType {
  Story = "story",
  Comment = "comment",
  Job = "job",
  Poll = "poll",
  PollOpt = "pollopt",
}

export interface IDocument {
  id: number;
  deleted?: boolean;
  type: DocumentType;
  by: string;
  time: number;
  text: string;
  dead?: boolean;
  parent: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
}

export interface ICrawler {
  doc_id: number;
  enqueue_at: number;
  watch_by: string[];
  schedule_at: number;
  schedule_attempts: number;

  doc: IDocument;
  diff: IDocumentDiff;
}

export interface ICrawlerTask {
  id: string;
  doc_id: number;
  created_at: Date;
}

export interface IDocumentDiff {
  ts: Date;
  score?: number;
  score_prev?: number;
  score_next?: number;
  descendants?: number;
  descendants_prev?: number;
  descendants_next?: number;
}

export interface IAlert {
  id: string;
  doc_id: number;
  uid: string;
  diff: IDocumentDiff;
  created_at: Date;
  text: string;

  delivered_at: number;
}
