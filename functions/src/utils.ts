import _ from "lodash";

export function backsoff(
  factor: number,
  rp: number,
  // minute
  multiplier: number = 1000 * 60
): number {
  return Math.pow(factor, rp) * (1 + _.random(-rp, rp, true)) * multiplier;
}
