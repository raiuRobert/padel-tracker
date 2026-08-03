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
 * 6 players, 1 court, in 9 rounds.
 *
 * Six people have 15 possible partnerships and a round uses 2, so the arithmetic alone puts the
 * floor at 8 rounds. Eight is reachable but leaves 16 sit-out slots to share between 6 players,
 * which can't come out level — some sit twice, some three times. Nine rounds spends 3 slots on
 * repeated partnerships to buy an evening where nobody can count anything unfair:
 *
 * - all 15 partnerships happen, 3 of them twice
 * - everyone sits out exactly 3 times, never twice running, spaced through the session
 * - everyone plays against everyone, 2 or 3 times each
 * - nobody keeps the same partner two rounds in a row
 *
 * Found by searching the 45 distinct fixtures (which pair sits × the 3 ways to split the other
 * four) for the 9-round arrangement that best satisfies all of the above at once. Written out
 * rather than generated because the properties above are what matter, and a table can be checked
 * against them directly — which is what the tests do.
 */
const SIX_PLAYER_ROUNDS: readonly {
  readonly teamA: readonly [number, number];
  readonly teamB: readonly [number, number];
  readonly sit: readonly [number, number];
}[] = [
  { teamA: [0, 3], teamB: [2, 5], sit: [1, 4] },
  { teamA: [1, 5], teamB: [2, 4], sit: [0, 3] },
  { teamA: [0, 4], teamB: [1, 3], sit: [2, 5] },
  { teamA: [0, 5], teamB: [2, 3], sit: [1, 4] },
  { teamA: [1, 4], teamB: [2, 5], sit: [0, 3] },
  { teamA: [0, 1], teamB: [3, 4], sit: [2, 5] },
  { teamA: [0, 2], teamB: [4, 5], sit: [1, 3] },
  { teamA: [0, 3], teamB: [1, 2], sit: [4, 5] },
  { teamA: [1, 4], teamB: [3, 5], sit: [0, 2] },
];

/**
 * 8 players across 2 courts run in blocks of 3 rounds. A block is one complete 4-player cycle on
 * each court; between blocks, two players swap courts.
 *
 * These four court splits are chosen so that consecutive blocks differ by exactly a two-for-two
 * swap *and* the first three blocks between them put all 28 possible player pairs on a court
 * together. Since a block partners everyone on a court with everyone else, that means by the end of
 * block 3 every player has partnered every other player at least once. The fourth block remixes
 * again, and the sequence repeats.
 */
const EIGHT_PLAYER_BLOCKS: readonly (readonly [readonly number[], readonly number[]])[] = [
  [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
  ],
  [
    [0, 1, 6, 7],
    [2, 3, 4, 5],
  ],
  [
    [0, 1, 4, 5],
    [2, 3, 6, 7],
  ],
  [
    [0, 2, 4, 6],
    [1, 3, 5, 7],
  ],
];

export const EIGHT_PLAYER_BLOCK_ROUNDS = 3;
export const EIGHT_PLAYER_BLOCK_COUNT = EIGHT_PLAYER_BLOCKS.length;

/** Which block a round belongs to. Block 0 is the opening one, before any court swap. */
export function eightPlayerBlock(index: number): number {
  return Math.floor(index / EIGHT_PLAYER_BLOCK_ROUNDS);
}

/** True when this round opens a new block, i.e. two players have just changed court. */
export function isCourtSwapRound(playerCount: number, index: number): boolean {
  return playerCount === 8 && index > 0 && index % EIGHT_PLAYER_BLOCK_ROUNDS === 0;
}

/**
 * Rounds until the whole pattern repeats — and, for every supported size, the point by which
 * everyone has partnered everyone at least once.
 */
export function americanoCycleLength(playerCount: number): number {
  switch (playerCount) {
    case 4:
      return 3;
    case 5:
      return 5;
    case 6:
      return SIX_PLAYER_ROUNDS.length;
    case 8:
      return EIGHT_PLAYER_BLOCK_ROUNDS * EIGHT_PLAYER_BLOCK_COUNT;
    default:
      throw new RotationConfigError(`No Americano cycle defined for ${playerCount} players.`);
  }
}

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

/** 6 players, 1 court: the 9-round schedule above, repeating once it runs out. */
function sixPlayerRound(players: readonly PlayerId[], index: number): Round {
  const { teamA, teamB, sit } = SIX_PLAYER_ROUNDS[index % SIX_PLAYER_ROUNDS.length];
  return {
    index,
    matches: [{ court: 1, teamA: team(players, teamA), teamB: team(players, teamB) }],
    sittingOut: sit.map((i) => players[i]),
  };
}

/**
 * 8 players, 2 courts. The roster arrives ordered as four pairs — `[a,b]`, `[c,d]`, `[e,f]`,
 * `[g,h]` — which the session setup lets the group choose. Those pairs are the opening
 * partnerships: the first two share court 1, the last two share court 2.
 *
 * Each block is a full 4-player cycle on each court, so everyone partners everyone they share a
 * court with. Between blocks two players change court, per `EIGHT_PLAYER_BLOCKS`.
 */
function eightPlayerRound(players: readonly PlayerId[], index: number): Round {
  const block = EIGHT_PLAYER_BLOCKS[eightPlayerBlock(index) % EIGHT_PLAYER_BLOCK_COUNT];
  const roundInBlock = index % EIGHT_PLAYER_BLOCK_ROUNDS;
  const onCourt = (court: 0 | 1) => block[court].map((i) => players[i]);

  return {
    index,
    matches: [
      fourPlayerMatch(onCourt(0), roundInBlock, 1),
      fourPlayerMatch(onCourt(1), roundInBlock, 2),
    ],
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
