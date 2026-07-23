import type { Match, PlayerId, PlayerTally, Round } from "./types";
import { shuffle } from "./random";
import { assertValidRoster, RotationConfigError } from "./validation";

/**
 * Mexicano: only the opening round is arbitrary. Every round after it is built from the current
 * standings so games stay competitive — 1st plays with 4th against 2nd with 3rd.
 *
 * Pairings are score-driven, but the sideline is not: sit-outs are chosen purely on who has sat
 * least, so a player having a good or bad session never changes how often they sit.
 */

export interface MexicanoOptions {
  readonly players: readonly PlayerId[];
  readonly courts: number;
  /** 0-based round index. Round 0 has no standings to rank on. */
  readonly index: number;
  /** Cumulative state going into this round. Missing players are treated as all-zero. */
  readonly tallies?: readonly PlayerTally[];
  /** Only consulted for round 0, to scramble the opening pairings. */
  readonly random?: () => number;
}

export function emptyTally(playerId: PlayerId): PlayerTally {
  return { playerId, gamesWon: 0, gamesLost: 0, roundsPlayed: 0, sitOuts: 0 };
}

export function emptyTallies(players: readonly PlayerId[]): PlayerTally[] {
  return players.map(emptyTally);
}

function tallyLookup(players: readonly PlayerId[], tallies: readonly PlayerTally[]): Map<PlayerId, PlayerTally> {
  const map = new Map(players.map((id) => [id, emptyTally(id)]));
  for (const tally of tallies) {
    if (map.has(tally.playerId)) map.set(tally.playerId, tally);
  }
  return map;
}

/**
 * Who sits this round: whoever has sat least, ties broken by the (possibly shuffled) roster order.
 * Because counts only ever increment by one, this naturally cycles — nobody sits a second time
 * until everyone has sat once.
 */
function chooseSitOuts(
  order: readonly PlayerId[],
  tallies: Map<PlayerId, PlayerTally>,
  count: number,
): PlayerId[] {
  if (count === 0) return [];
  return order
    .map((playerId, orderIndex) => ({ playerId, orderIndex, sitOuts: tallies.get(playerId)!.sitOuts }))
    .sort((a, b) => a.sitOuts - b.sitOuts || a.orderIndex - b.orderIndex)
    .slice(0, count)
    .map((entry) => entry.playerId);
}

/** Standings order: most games won, then fewest conceded, then roster order to stay deterministic. */
function rankPlayers(
  order: readonly PlayerId[],
  tallies: Map<PlayerId, PlayerTally>,
  playing: ReadonlySet<PlayerId>,
): PlayerId[] {
  return order
    .filter((id) => playing.has(id))
    .map((playerId, orderIndex) => ({ playerId, orderIndex, tally: tallies.get(playerId)! }))
    .sort(
      (a, b) =>
        b.tally.gamesWon - a.tally.gamesWon ||
        a.tally.gamesLost - b.tally.gamesLost ||
        a.orderIndex - b.orderIndex,
    )
    .map((entry) => entry.playerId);
}

/**
 * Builds one Mexicano round. Call it before each round with the standings as they stand — that
 * adaptive step is the entire difference from Americano.
 */
export function mexicanoRound({ players, courts, index, tallies = [], random }: MexicanoOptions): Round {
  assertValidRoster(players, courts);
  if (!Number.isInteger(index) || index < 0) {
    throw new RotationConfigError(`Round index must be a non-negative integer, got ${index}.`);
  }

  // Only the opening round is arbitrary; from then on the roster order is a pure tie-break.
  const order = index === 0 && random ? shuffle(players, random) : players;
  const lookup = tallyLookup(players, tallies);

  const seats = courts * 4;
  const sittingOut = chooseSitOuts(order, lookup, players.length - seats);
  const sitting = new Set(sittingOut);
  const playing = new Set(order.filter((id) => !sitting.has(id)));

  const ranked = rankPlayers(order, lookup, playing);

  // Rank 1 with rank 4 against rank 2 with rank 3, court by court: the top four share court 1,
  // the next four court 2, and so on.
  const matches: Match[] = [];
  for (let court = 0; court < courts; court++) {
    const [first, second, third, fourth] = ranked.slice(court * 4, court * 4 + 4);
    matches.push({ court: court + 1, teamA: [first, fourth], teamB: [second, third] });
  }

  return { index, matches, sittingOut };
}
