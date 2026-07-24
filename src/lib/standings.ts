import type { PlayerId, PlayerTally, Round, Side } from "./rotation/types";

/**
 * Turning played rounds into per-player numbers. Kept separate from the rotation engine because
 * both modes consume it (Mexicano ranks on it) and the standings and cost-split screens read it.
 */

export interface MatchResult {
  /** 1-based court number, matching the `Match` it scores. */
  readonly court: number;
  /** Which team won. Games aren't scored by points — one side wins it, and that's the result. */
  readonly winner: Side;
}

export interface PlayedRound {
  readonly round: Round;
  /** One entry per court. A round still in play simply has no results yet. */
  readonly results: readonly MatchResult[];
}

/** A leaderboard line. Points *are* games won, so there's nothing further to derive. */
export type StandingsRow = PlayerTally;

interface MutableTally {
  playerId: PlayerId;
  points: number;
  losses: number;
  roundsPlayed: number;
  sitOuts: number;
}

/**
 * Callers are expected to pass rounds that have actually been played — see `toPlayedRounds`, which
 * filters out an Americano schedule's unplayed fixtures. A court with no result still counts
 * towards rounds played, so time on court is never lost even if a score goes unrecorded.
 */
export function computeTallies(
  players: readonly PlayerId[],
  playedRounds: readonly PlayedRound[],
): PlayerTally[] {
  const tallies = new Map<PlayerId, MutableTally>(
    players.map((playerId) => [playerId, { playerId, points: 0, losses: 0, roundsPlayed: 0, sitOuts: 0 }]),
  );

  for (const { round, results } of playedRounds) {
    const byCourt = new Map(results.map((result) => [result.court, result]));

    for (const match of round.matches) {
      const winner = byCourt.get(match.court)?.winner;
      for (const [side, sidePlayers] of [["A", match.teamA], ["B", match.teamB]] as const) {
        for (const id of sidePlayers) {
          const tally = tallies.get(id);
          if (!tally) continue;
          tally.roundsPlayed += 1;
          if (winner === side) tally.points += 1;
          else if (winner) tally.losses += 1;
        }
      }
    }

    for (const id of round.sittingOut) {
      const tally = tallies.get(id);
      if (tally) tally.sitOuts += 1;
    }
  }

  return players.map((id) => ({ ...tallies.get(id)! }));
}

/**
 * The leaderboard, best first: most points, then fewest losses so someone who won the same number
 * of games from fewer outings ranks higher, then player id to keep the order stable across renders.
 */
export function computeStandings(
  players: readonly PlayerId[],
  playedRounds: readonly PlayedRound[],
): StandingsRow[] {
  return computeTallies(players, playedRounds).sort(
    (a, b) => b.points - a.points || a.losses - b.losses || a.playerId.localeCompare(b.playerId),
  );
}

/** Merges several sessions' worth of played rounds into one all-time table. */
export function combineStandings(
  players: readonly PlayerId[],
  sessions: readonly (readonly PlayedRound[])[],
): StandingsRow[] {
  return computeStandings(players, sessions.flat());
}
