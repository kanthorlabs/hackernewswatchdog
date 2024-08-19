import _ from "lodash";
import { decodeTime, encodeTime } from "ulid";
import * as logger from "firebase-functions/logger";

export function backsoff(
  attempts: number,
  factor: number,
  rp: number,
  // minute
  multiplier: number = 1000 * 60
): number {
  return Math.round(
    Math.pow(attempts, factor) *
      (1 + _.random(-rp / 100, rp / 100, true)) *
      multiplier
  );
}

export function genNextScheduleId(id: string, duration: number): string {
  return getScheduleIdFromtime(decodeTime(id) + duration);
}

export function getScheduleIdFromtime(ts: number): string {
  return encodeTime(ts, 10) + "0".repeat(16);
}

export function catcher(err: Error) {
  logger.error(err);
  return null;
}
