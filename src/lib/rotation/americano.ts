import type { Match, PlayerId, Round, Team } from "./types";
import { assertValidRoster, RotationConfigError } from "./validation";

/**
 * Americano: the entire schedule is computed before a ball is hit. Results never influence who
 * plays next — they only accumulate against each player's name.
 */

export interface AmericanoOptions {
  readonly players: readonly PlayerId[];
  readonly courts: number;
  /** How many rounds to generate. Cycles repeat as needed to fill the count. */
  readonly rounds: number;
}

/**
 * The three ways to split 4 players into two teams. Playing all three uses each of the
 * 6 possible partnerships exactly once, which is why a 4-player cycle is 3 rounds.
 */
const FOUR_PLAYER_ROUNDS: readonly (readonly [readonly [number, number], readonly [number, number]])[] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 3],
    [1, 2],
  ],
];

/**
 * With 6 players locked into 3 fixed partnerships, a cycle is the 3 ways to pick which pair sits.
 * Every pair sits exactly once and meets every other pair exactly once.
 */
const SIX_PLAYER_MATCHUPS: readonly { readonly play: readonly [number, number]; readonly sit: number }[] = [
  { play: [0, 1], sit: 2 },
  { play: [0, 2], sit: 1 },
  { play: [1, 2], sit: 0 },
];

/**
 * A 1-factorization of K6 by the circle method: player 5 stays put while 0..4 rotate. The five
 * resulting pair sets are pairwise disjoint and together cover all 15 possible partnerships, so
 * five consecutive reshuffles never repeat a partnership.
 */
const SIX_PLAYER_PAIR_SETS: readonly (readonly (readonly [number, number])[])[] = Array.from(
  { length: 5 },
  (_, i) =>
    [
      [5, i],
      [(i + 1) % 5, (i + 4) % 5],
      [(i + 2) % 5, (i + 3) % 5],
    ] as const,
);

/** Rounds until the sit-out and matchup pattern repeats (6 players also reshuffle partnerships). */
export function americanoCycleLength(playerCount: number): number {
  switch (playerCount) {
    case 4:
    case 6:
    case 8:
      return 3;
    case 5:
      return 5;
    default:
      throw new RotationConfigError(`No Americano cycle defined for ${playerCount} players.`);
  }
}

/** Rounds until 6-player partnerships themselves repeat: 5 disjoint pair sets × 3 rounds each. */
export const SIX_PLAYER_PARTNERSHIP_CYCLE_ROUNDS = SIX_PLAYER_PAIR_SETS.length * 3;

function team(players: readonly PlayerId[], [a, b]: readonly [number, number]): Team {
  return [players[a], players[b]];
}

function fourPlayerMatch(group: readonly PlayerId[], roundInCycle: number, court: number): Match {
  const [teamA, teamB] = FOUR_PLAYER_ROUNDS[roundInCycle % FOUR_PLAYER_ROUNDS.length];
  return { court, teamA: team(group, teamA), teamB: team(group, teamB) };
}

function fourPlayerRound(players: readonly PlayerId[], index: number): Round {
  return { index, matches: [fourPlayerMatch(players, index % 3, 1)], sittingOut: [] };
}

/**
 * 5 players, 1 court: player `r % 5` sits out round `r`, and the remaining four pair up as
 * (r+1, r+4) vs (r+2, r+3) mod 5. Over 5 rounds that covers all 10 partnerships exactly once and
 * sits everyone exactly once.
 *
 * Note that exactly one seat changes hands between consecutive rounds — the player coming off the
 * sideline replaces the one going onto it — rather than a whole pair stepping out. A schedule where
 * *only* that seat changed is impossible without repeating a partnership, so the other three
 * players do shuffle between teams.
 */
function fivePlayerRound(players: readonly PlayerId[], index: number): Round {
  const r = index % 5;
  const at = (offset: number) => players[(r + offset) % 5];
  return {
    index,
    matches: [{ court: 1, teamA: [at(1), at(4)], teamB: [at(2), at(3)] }],
    sittingOut: [players[r]],
  };
}

/**
 * 6 players, 1 court: three fixed partnerships, two of which play while the third sits. After a
 * full 3-round cycle the six are reshuffled into a genuinely new set of partnerships.
 */
function sixPlayerRound(players: readonly PlayerId[], index: number): Round {
  const cycle = Math.floor(index / 3);
  const pairSet = SIX_PLAYER_PAIR_SETS[cycle % SIX_PLAYER_PAIR_SETS.length];
  const pairs = pairSet.map((pair) => team(players, pair));

  const { play, sit } = SIX_PLAYER_MATCHUPS[index % 3];
  return {
    index,
    matches: [{ court: 1, teamA: pairs[play[0]], teamB: pairs[play[1]] }],
    sittingOut: [...pairs[sit]],
  };
}

/**
 * 8 players, 2 courts: two fixed groups of 4, each running its own independent 4-player cycle on
 * its own court. Nobody crosses courts.
 *
 * Extension point: mixing players between courts (so the two groups aren't fixed for the whole
 * session) would replace this fixed split with a schedule over all 8 players. Deliberately not
 * built for the MVP — it changes the fairness guarantees and needs its own design.
 */
function eightPlayerRound(players: readonly PlayerId[], index: number): Round {
  const groupA = players.slice(0, 4);
  const groupB = players.slice(4, 8);
  const roundInCycle = index % 3;
  return {
    index,
    matches: [fourPlayerMatch(groupA, roundInCycle, 1), fourPlayerMatch(groupB, roundInCycle, 2)],
    sittingOut: [],
  };
}

/** Builds a single Americano round without materialising the whole schedule. */
export function americanoRound(players: readonly PlayerId[], courts: number, index: number): Round {
  assertValidRoster(players, courts);
  switch (players.length) {
    case 4:
      return fourPlayerRound(players, index);
    case 5:
      return fivePlayerRound(players, index);
    case 6:
      return sixPlayerRound(players, index);
    case 8:
      return eightPlayerRound(players, index);
    default:
      throw new RotationConfigError(`No Americano schedule defined for ${players.length} players.`);
  }
}

/** Generates the full fixed schedule up front, which is the whole point of Americano. */
export function generateAmericanoSchedule({ players, courts, rounds }: AmericanoOptions): Round[] {
  assertValidRoster(players, courts);
  if (!Number.isInteger(rounds) || rounds < 1) {
    throw new RotationConfigError(`Round count must be a positive integer, got ${rounds}.`);
  }
  return Array.from({ length: rounds }, (_, index) => americanoRound(players, courts, index));
}
