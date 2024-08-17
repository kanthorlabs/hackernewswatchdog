import {
  Request,
  Response,
  RouteParameters,
  NextFunction,
} from "express-serve-static-core";
import { ParsedQs } from "qs";

export type IGatewayRequest = Request<
  RouteParameters<string>,
  any,
  any,
  ParsedQs,
  Record<string, any>
>;

export type IGatewayResponse = Response<any, Record<string, any>>;

export type IGatewayHandler = (
  req: IGatewayRequest,
  res: Response<any, Record<string, any>>,
  next: NextFunction
) => Promise<any>;

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
  kids: number[];
  time: number;
  text: string;
  title?: string;
}
