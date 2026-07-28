import { splitCosts, type CostSplit } from "./cost";
import type { Session, SessionRound } from "./domain";
import { isCourtSwapRound, nextRound } from "./rotation";
import type { PlayerId, PlayerTally, Round } from "./rotation/types";
import { computeStandings, computeTallies, type PlayedRound, type StandingsRow } from "./standings";

/**
 * The glue between a stored session and the pure engines. Lives here rather than in components so
 * the interesting bits stay testable and reusable from a future React Native app.
 */

/** A round counts as scored once every court on it has a result. */
export function isRoundScored(round: SessionRound): boolean {
  return round.matches.length > 0 && round.results.length === round.matches.length;
}

/**
 * Only rounds that have actually been scored.
 *
 * This filter matters: an Americano session generates its entire schedule up front, so
 * `session.rounds` is full of fixtures nobody has played yet. Counting those would credit players
 * with rotations they haven't played and bill them for court time they haven't used.
 */
export function toPlayedRounds(session: Session): PlayedRound[] {
  return session.rounds.filter(isRoundScored).map((round) => ({
    round: { index: round.index, matches: round.matches, sittingOut: round.sittingOut },
    results: round.results,
  }));
}

export function sessionTallies(session: Session): PlayerTally[] {
  return computeTallies(session.playerIds, toPlayedRounds(session));
}

export function sessionStandings(session: Session): StandingsRow[] {
  return computeStandings(session.playerIds, toPlayedRounds(session));
}

/** The first round with no score entered — what the live view should be showing. */
export function currentRound(session: Session): SessionRound | undefined {
  return session.rounds.find((round) => !isRoundScored(round));
}

export function scoredRoundCount(session: Session): number {
  return session.rounds.filter(isRoundScored).length;
}

/**
 * Builds the next fixture. Americano's is fixed from the start; Mexicano's depends on the standings
 * at this exact moment, which is why this is called lazily rather than generated up front.
 */
export function buildNextRound(session: Session): SessionRound {
  const round: Round = nextRound({
    mode: session.mode,
    players: session.playerIds,
    courts: session.courts,
    index: session.rounds.length,
    tallies: sessionTallies(session),
  });
  return { index: round.index, matches: round.matches, sittingOut: round.sittingOut, results: [] };
}

/**
 * True when a round begins a new block of the 8-player rotation — the point where two players
 * change court. Worth flagging in the UI, because it's the one moment people have to move.
 */
export function startsWithCourtSwap(session: Session, index: number): boolean {
  return session.mode === "americano" && isCourtSwapRound(session.playerIds.length, index);
}

/** Rotations each player was actually on court for — the weight the court fee is split by. */
export function sessionParticipation(session: Session): { playerId: PlayerId; roundsPlayed: number }[] {
  const tallies = sessionTallies(session);
  return tallies.map(({ playerId, roundsPlayed }) => ({ playerId, roundsPlayed }));
}

export function sessionCostSplit(session: Session): CostSplit {
  return splitCosts({
    players: session.playerIds,
    bookings: session.bookings,
    participation: sessionParticipation(session),
    extras: session.extras,
    paidBy: session.paidBy,
    courtSplit: session.courtSplit,
  });
}
