import { describe, expect, it } from "vitest";
import {
  americanoCycleLength,
  americanoRound,
  generateAmericanoSchedule,
  SIX_PLAYER_PARTNERSHIP_CYCLE_ROUNDS,
} from "./americano";
import { partnershipKey } from "./types";
import type { Round } from "./types";
import { RotationConfigError } from "./validation";
import {
  allPartnershipKeys,
  everyPartnershipKey,
  expectFairSitOuts,
  expectWellFormedRounds,
  partnershipKeys,
  roster,
  sitOutCounts,
} from "./test-utils";

const schedule = (players: number, courts: number, rounds: number): Round[] =>
  generateAmericanoSchedule({ players: roster(players), courts, rounds });

describe("Americano — 4 players, 1 court", () => {
  const players = roster(4);
  const cycle = americanoCycleLength(4);

  it("has a 3-round cycle", () => {
    expect(cycle).toBe(3);
  });

  it("produces well-formed rounds with nobody sitting out", () => {
    const rounds = schedule(4, 1, 12);
    expectWellFormedRounds(rounds, players, 1);
    for (const round of rounds) expect(round.sittingOut).toEqual([]);
  });

  it("uses every one of the 6 partnerships exactly once per cycle", () => {
    const keys = allPartnershipKeys(schedule(4, 1, cycle));
    expect(keys).toHaveLength(6);
    expect([...keys].sort()).toEqual(everyPartnershipKey(players));
  });

  it("repeats the cycle once all partnerships are used up", () => {
    const rounds = schedule(4, 1, 6);
    expect(partnershipKeys(rounds[3])).toEqual(partnershipKeys(rounds[0]));
    expect(partnershipKeys(rounds[4])).toEqual(partnershipKeys(rounds[1]));
  });
});

describe("Americano — 5 players, 1 court", () => {
  const players = roster(5);
  const cycle = americanoCycleLength(5);

  it("has a 5-round cycle", () => {
    expect(cycle).toBe(5);
  });

  it("sits exactly one player out per round", () => {
    const rounds = schedule(5, 1, 20);
    expectWellFormedRounds(rounds, players, 1);
    for (const round of rounds) expect(round.sittingOut).toHaveLength(1);
  });

  it("sits every player out exactly once per cycle", () => {
    const counts = sitOutCounts(schedule(5, 1, cycle), players);
    expect([...counts.values()]).toEqual([1, 1, 1, 1, 1]);
  });

  it("uses every one of the 10 partnerships exactly once per cycle", () => {
    const keys = allPartnershipKeys(schedule(5, 1, cycle));
    expect(keys).toHaveLength(10);
    expect([...keys].sort()).toEqual(everyPartnershipKey(players));
  });

  it("never repeats a sit-out before everyone has sat", () => {
    expectFairSitOuts(schedule(5, 1, 25), players);
  });

  it("rotates a single seat between rounds rather than a whole pair", () => {
    const rounds = schedule(5, 1, 10);
    for (let i = 1; i < rounds.length; i++) {
      const previous = new Set(rounds[i - 1].matches.flatMap((m) => [...m.teamA, ...m.teamB]));
      const current = rounds[i].matches.flatMap((m) => [...m.teamA, ...m.teamB]);
      const stayedOn = current.filter((id) => previous.has(id));
      expect(stayedOn, `round ${i - 1} -> ${i}: exactly one player should swap`).toHaveLength(3);
    }
  });

  it("repeats the cycle after 5 rounds", () => {
    const rounds = schedule(5, 1, 10);
    expect(rounds[5].sittingOut).toEqual(rounds[0].sittingOut);
    expect(partnershipKeys(rounds[5])).toEqual(partnershipKeys(rounds[0]));
  });
});

describe("Americano — 6 players, 1 court", () => {
  const players = roster(6);
  const cycle = americanoCycleLength(6);

  /** The three fixed partnerships in play during the cycle starting at `cycleIndex`. */
  const pairSetOf = (rounds: readonly Round[], cycleIndex: number): string[] =>
    [...new Set(allPartnershipKeys(rounds.slice(cycleIndex * 3, cycleIndex * 3 + 3)))].sort();

  it("has a cycle of exactly 3 rounds", () => {
    expect(cycle).toBe(3);
  });

  it("sits out a whole pair each round, never a lone player", () => {
    const rounds = schedule(6, 1, 15);
    expectWellFormedRounds(rounds, players, 1);
    for (const round of rounds) expect(round.sittingOut).toHaveLength(2);
  });

  it("uses only the three fixed partnerships within a cycle", () => {
    const rounds = schedule(6, 1, cycle);
    expect(pairSetOf(rounds, 0)).toHaveLength(3);
  });

  it("sits each pair out exactly once per cycle", () => {
    const rounds = schedule(6, 1, cycle);
    const benched = rounds.map((round) => partnershipKey([round.sittingOut[0], round.sittingOut[1]]));
    expect(new Set(benched).size).toBe(3);
    expect([...benched].sort()).toEqual(pairSetOf(rounds, 0));
  });

  it("has every pair play every other pair exactly once per cycle", () => {
    const rounds = schedule(6, 1, cycle);
    const matchups = rounds.map((round) =>
      [partnershipKey(round.matches[0].teamA), partnershipKey(round.matches[0].teamB)].sort().join(" vs "),
    );
    expect(new Set(matchups).size).toBe(3);
  });

  it("reshuffles into a genuinely new set of partnerships after each cycle", () => {
    const rounds = schedule(6, 1, SIX_PLAYER_PARTNERSHIP_CYCLE_ROUNDS);
    const first = pairSetOf(rounds, 0);
    const second = pairSetOf(rounds, 1);
    expect(second).toHaveLength(3);
    expect(second.filter((key) => first.includes(key))).toEqual([]);
  });

  it("covers all 15 partnerships across 5 cycles without a single repeat", () => {
    const rounds = schedule(6, 1, SIX_PLAYER_PARTNERSHIP_CYCLE_ROUNDS);
    const sets = [0, 1, 2, 3, 4].map((i) => pairSetOf(rounds, i));
    const combined = sets.flat();
    expect(combined).toHaveLength(15);
    expect(new Set(combined).size).toBe(15);
    expect([...combined].sort()).toEqual(everyPartnershipKey(players));
  });

  it("returns to the opening pair set once all partnerships are exhausted", () => {
    const rounds = schedule(6, 1, SIX_PLAYER_PARTNERSHIP_CYCLE_ROUNDS + 3);
    expect(pairSetOf(rounds, 5)).toEqual(pairSetOf(rounds, 0));
  });

  it("never repeats a sit-out before everyone has sat", () => {
    expectFairSitOuts(schedule(6, 1, 15), players);
  });
});

describe("Americano — 8 players, 2 courts", () => {
  const players = roster(8);

  it("runs both courts every round with nobody sitting out", () => {
    const rounds = schedule(8, 2, 12);
    expectWellFormedRounds(rounds, players, 2);
    for (const round of rounds) expect(round.sittingOut).toEqual([]);
  });

  it("keeps the two groups of four fixed for the whole session", () => {
    const rounds = schedule(8, 2, 12);
    const groupOf = (round: Round, court: number) =>
      [...round.matches[court].teamA, ...round.matches[court].teamB].sort();

    const firstCourt = groupOf(rounds[0], 0);
    const secondCourt = groupOf(rounds[0], 1);
    expect(firstCourt).toEqual(["p1", "p2", "p3", "p4"]);
    expect(secondCourt).toEqual(["p5", "p6", "p7", "p8"]);

    for (const round of rounds) {
      expect(groupOf(round, 0), `round ${round.index} court 1`).toEqual(firstCourt);
      expect(groupOf(round, 1), `round ${round.index} court 2`).toEqual(secondCourt);
    }
  });

  it("gives each court its own complete 3-round 4-player cycle", () => {
    const rounds = schedule(8, 2, 3);
    for (const court of [0, 1]) {
      const group = [...rounds[0].matches[court].teamA, ...rounds[0].matches[court].teamB];
      const keys = rounds.flatMap((round) =>
        [round.matches[court].teamA, round.matches[court].teamB].map(partnershipKey),
      );
      expect(keys).toHaveLength(6);
      expect([...keys].sort()).toEqual(everyPartnershipKey(group));
    }
  });

  it("never repeats a sit-out before everyone has sat", () => {
    expectFairSitOuts(schedule(8, 2, 12), players);
  });
});

describe("Americano — schedule shape and validation", () => {
  it("returns exactly the requested number of rounds, indexed sequentially", () => {
    const rounds = schedule(6, 1, 7);
    expect(rounds).toHaveLength(7);
    expect(rounds.map((r) => r.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("generates the same round whether taken from a schedule or built standalone", () => {
    const players = roster(5);
    const rounds = generateAmericanoSchedule({ players, courts: 1, rounds: 7 });
    for (let i = 0; i < rounds.length; i++) {
      expect(americanoRound(players, 1, i)).toEqual(rounds[i]);
    }
  });

  it.each([
    [4, 2],
    [5, 2],
    [6, 2],
    [8, 1],
    [7, 1],
    [3, 1],
    [10, 2],
  ])("rejects %i players on %i court(s)", (players, courts) => {
    expect(() => schedule(players, courts, 3)).toThrow(RotationConfigError);
  });

  it("rejects a roster with duplicate players", () => {
    expect(() => generateAmericanoSchedule({ players: ["a", "b", "c", "a"], courts: 1, rounds: 3 })).toThrow(
      /duplicate/i,
    );
  });

  it("rejects a non-positive round count", () => {
    expect(() => schedule(4, 1, 0)).toThrow(RotationConfigError);
  });

  it("rejects a cycle lookup for an unsupported player count", () => {
    expect(() => americanoCycleLength(7)).toThrow(RotationConfigError);
  });
});
