import _ from "lodash";
import * as logger from "firebase-functions/logger";

export function backsoff(
  factor: number,
  rp: number,
  // minute
  multiplier: number = 1000 * 60
): number {
  return Math.pow(factor, rp) * (1 + _.random(-rp, rp, true)) * multiplier;
}

export function catcher(err: Error) {
  logger.error(err);
  return null;
}
