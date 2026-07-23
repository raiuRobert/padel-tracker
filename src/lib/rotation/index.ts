import { americanoRound } from "./americano";
import { mexicanoRound } from "./mexicano";
import type { PlayerId, PlayerTally, RotationMode, Round } from "./types";

export * from "./types";
export * from "./validation";
export * from "./americano";
export * from "./mexicano";
export { seededRandom, shuffle } from "./random";

export interface NextRoundOptions {
  readonly mode: RotationMode;
  readonly players: readonly PlayerId[];
  readonly courts: number;
  /** 0-based round index. */
  readonly index: number;
  /** Standings going into this round. Ignored by Americano, which is fixed up front. */
  readonly tallies?: readonly PlayerTally[];
  /** Only used to scramble Mexicano's opening round. */
  readonly random?: () => number;
}

/**
 * Single entry point for the UI: hand it the mode and the current state, get the next round back.
 * Americano ignores the standings by design — its schedule is decided before play starts.
 */
export function nextRound({ mode, players, courts, index, tallies, random }: NextRoundOptions): Round {
  return mode === "americano"
    ? americanoRound(players, courts, index)
    : mexicanoRound({ players, courts, index, tallies, random });
}
