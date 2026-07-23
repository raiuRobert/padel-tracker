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

interface MutableTally {
  playerId: PlayerId;
  gamesWon: number;
  gamesLost: number;
  roundsPlayed: number;
  sitOuts: number;
}

/**
 * Rounds played counts time on court, so it ticks up as soon as a player takes the court —
 * whether or not the score has been entered yet. Games won and lost only move once it has.
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
