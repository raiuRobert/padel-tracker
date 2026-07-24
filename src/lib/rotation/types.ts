/**
 * Core rotation types.
 *
 * This module — and everything else under `lib/` — is deliberately plain TypeScript with no React,
 * no DOM and no storage imports, so the same engine can be dropped into a React Native app later.
 */

/** Stable identifier for a player. The engine never inspects it beyond equality and ordering. */
export type PlayerId = string;

export type RotationMode = "americano" | "mexicano";

/** Two players on the same side of the net. */
export type Team = readonly [PlayerId, PlayerId];

/** One game on one court within a round. */
export interface Match {
  /** 1-based court number. */
  readonly court: number;
  readonly teamA: Team;
  readonly teamB: Team;
}

/** One rotation: every court plays simultaneously, everyone else sits it out. */
export interface Round {
  /** 0-based index within the session. */
  readonly index: number;
  readonly matches: readonly Match[];
  readonly sittingOut: readonly PlayerId[];
}

/** Which side of the net won a game. */
export type Side = "A" | "B";

/**
 * Cumulative per-player state. Americano ignores this entirely; Mexicano ranks on it to build the
 * next round, and both modes use `sitOuts` to keep the sideline fair.
 *
 * A game is won outright by one team — there's no game score to keep — so every player on the
 * winning side takes a point.
 */
export interface PlayerTally {
  readonly playerId: PlayerId;
  /** Games won. One point per game, per player on the winning team. */
  readonly points: number;
  readonly losses: number;
  readonly roundsPlayed: number;
  readonly sitOuts: number;
}

/** Every player on court in a round, in match order (teamA then teamB, court by court). */
export function playersOnCourt(round: Round): PlayerId[] {
  return round.matches.flatMap((match) => [...match.teamA, ...match.teamB]);
}

/** Both partnerships formed by a match. */
export function partnershipsInMatch(match: Match): Team[] {
  return [match.teamA, match.teamB];
}

/** Every partnership formed in a round, across all courts. */
export function partnershipsInRound(round: Round): Team[] {
  return round.matches.flatMap(partnershipsInMatch);
}

/** Order-independent key for a partnership, for set membership and repeat detection. */
export function partnershipKey(team: Team): string {
  return [...team].sort().join("|");
}
