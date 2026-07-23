import type { PlayerId, PlayerTally, Round } from "./rotation/types";

/**
 * Turning played rounds into per-player numbers. Kept separate from the rotation engine because
 * both modes consume it (Mexicano ranks on it) and the standings and cost-split screens read it.
 */

export interface MatchResult {
  /** 1-based court number, matching the `Match` it scores. */
  readonly court: number;
  readonly teamAGames: number;
  readonly teamBGames: number;
}

export interface PlayedRound {
  readonly round: Round;
  /** One entry per court. A round still in play simply has no results yet. */
  readonly results: readonly MatchResult[];
}

/** A leaderboard line: the raw tally plus the derived numbers the standings screens show. */
export interface StandingsRow extends PlayerTally {
  /** Rotations won outright. A drawn rotation counts for neither side. */
  readonly matchesWon: number;
  readonly matchesLost: number;
  readonly gameDifference: number;
}

interface MutableTally {
  playerId: PlayerId;
  gamesWon: number;
  gamesLost: number;
  roundsPlayed: number;
  sitOuts: number;
}

/**
 * Callers are expected to pass rounds that have actually been played — see `toPlayedRounds`, which
 * filters out an Americano schedule's unplayed fixtures. A court with no result still counts
 * towards rounds played, so a round scored 0-0 doesn't erase anyone's time on court.
 */
export function computeTallies(
  players: readonly PlayerId[],
  playedRounds: readonly PlayedRound[],
): PlayerTally[] {
  const tallies = new Map<PlayerId, MutableTally>(
    players.map((playerId) => [playerId, { playerId, gamesWon: 0, gamesLost: 0, roundsPlayed: 0, sitOuts: 0 }]),
  );

  for (const { round, results } of playedRounds) {
    const byCourt = new Map(results.map((result) => [result.court, result]));

    for (const match of round.matches) {
      const result = byCourt.get(match.court);
      const sides = [
        { players: match.teamA, won: result?.teamAGames ?? 0, lost: result?.teamBGames ?? 0 },
        { players: match.teamB, won: result?.teamBGames ?? 0, lost: result?.teamAGames ?? 0 },
      ];
      for (const side of sides) {
        for (const id of side.players) {
          const tally = tallies.get(id);
          if (!tally) continue;
          tally.roundsPlayed += 1;
          tally.gamesWon += side.won;
          tally.gamesLost += side.lost;
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

/** How many rotations each player won and lost outright, ignoring drawn ones. */
function countMatchOutcomes(
  players: readonly PlayerId[],
  playedRounds: readonly PlayedRound[],
): Map<PlayerId, { won: number; lost: number }> {
  const outcomes = new Map(players.map((id) => [id, { won: 0, lost: 0 }]));

  for (const { round, results } of playedRounds) {
    const byCourt = new Map(results.map((result) => [result.court, result]));
    for (const match of round.matches) {
      const result = byCourt.get(match.court);
      if (!result || result.teamAGames === result.teamBGames) continue;

      const teamAWon = result.teamAGames > result.teamBGames;
      const winners = teamAWon ? match.teamA : match.teamB;
      const losers = teamAWon ? match.teamB : match.teamA;
      for (const id of winners) {
        const outcome = outcomes.get(id);
        if (outcome) outcome.won += 1;
      }
      for (const id of losers) {
        const outcome = outcomes.get(id);
        if (outcome) outcome.lost += 1;
      }
    }
  }
  return outcomes;
}

/**
 * The leaderboard, best first. Games won is the headline number — that's what an Americano or
 * Mexicano is scored on — with game difference and then games conceded breaking ties, and the
 * player id last so the order is stable across renders.
 */
export function computeStandings(
  players: readonly PlayerId[],
  playedRounds: readonly PlayedRound[],
): StandingsRow[] {
  const outcomes = countMatchOutcomes(players, playedRounds);

  return computeTallies(players, playedRounds)
    .map((tally) => ({
      ...tally,
      matchesWon: outcomes.get(tally.playerId)!.won,
      matchesLost: outcomes.get(tally.playerId)!.lost,
      gameDifference: tally.gamesWon - tally.gamesLost,
    }))
    .sort(
      (a, b) =>
        b.gamesWon - a.gamesWon ||
        b.gameDifference - a.gameDifference ||
        a.gamesLost - b.gamesLost ||
        a.playerId.localeCompare(b.playerId),
    );
}

/** Merges several sessions' worth of played rounds into one all-time table. */
export function combineStandings(
  players: readonly PlayerId[],
  sessions: readonly (readonly PlayedRound[])[],
): StandingsRow[] {
  return computeStandings(players, sessions.flat());
}
