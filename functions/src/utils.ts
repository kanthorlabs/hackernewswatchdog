import _ from "lodash";
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

export function catcher(err: Error) {
  logger.error(err.message);
  return null;
}
