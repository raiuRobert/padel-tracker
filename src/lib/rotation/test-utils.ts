import { expect } from "vitest";
import type { PlayerId, Round } from "./types";
import { partnershipKey, partnershipsInRound, playersOnCourt } from "./types";

/** `["p1", "p2", ...]` — readable ids so failures point at a specific player. */
export function roster(size: number): PlayerId[] {
  return Array.from({ length: size }, (_, i) => `p${i + 1}`);
}

export function partnershipKeys(round: Round): string[] {
  return partnershipsInRound(round).map(partnershipKey);
}

/** Every partnership formed across a span of rounds, in order, including repeats. */
export function allPartnershipKeys(rounds: readonly Round[]): string[] {
  return rounds.flatMap(partnershipKeys);
}

/**
 * The fairness rule both modes must obey: nobody sits a second time until everyone has sat once.
 * Equivalent to the spread between the most- and least-sat player never exceeding one.
 */
export function expectFairSitOuts(rounds: readonly Round[], players: readonly PlayerId[]): void {
  const counts = new Map<PlayerId, number>(players.map((id) => [id, 0]));
  for (const round of rounds) {
    for (const id of round.sittingOut) counts.set(id, counts.get(id)! + 1);
    const values = [...counts.values()];
    expect(
      Math.max(...values) - Math.min(...values),
      `sit-out spread after round ${round.index}: ${JSON.stringify([...counts])}`,
    ).toBeLessThanOrEqual(1);
  }
}

/** Everyone in the roster is either on a court exactly once, or on the bench. */
export function expectWellFormedRound(round: Round, players: readonly PlayerId[], courts: number): void {
  const onCourt = playersOnCourt(round);
  expect(round.matches, `round ${round.index} court count`).toHaveLength(courts);
  expect(onCourt, `round ${round.index} seats`).toHaveLength(courts * 4);
  expect(new Set(onCourt).size, `round ${round.index} has a duplicated player`).toBe(onCourt.length);
  expect([...onCourt, ...round.sittingOut].sort()).toEqual([...players].sort());
  expect(round.matches.map((m) => m.court)).toEqual(Array.from({ length: courts }, (_, i) => i + 1));
}

export function expectWellFormedRounds(
  rounds: readonly Round[],
  players: readonly PlayerId[],
  courts: number,
): void {
  for (const round of rounds) expectWellFormedRound(round, players, courts);
}

/** How many times each player sat out across the given rounds. */
export function sitOutCounts(rounds: readonly Round[], players: readonly PlayerId[]): Map<PlayerId, number> {
  const counts = new Map<PlayerId, number>(players.map((id) => [id, 0]));
  for (const round of rounds) {
    for (const id of round.sittingOut) counts.set(id, counts.get(id)! + 1);
  }
  return counts;
}

/** All unordered pairs of a roster, as partnership keys — the complete partnership space. */
export function everyPartnershipKey(players: readonly PlayerId[]): string[] {
  const keys: string[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      keys.push(partnershipKey([players[i], players[j]]));
    }
  }
  return keys.sort();
}
