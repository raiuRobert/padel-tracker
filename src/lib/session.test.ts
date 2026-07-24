import { describe, expect, it } from "vitest";
import type { Session, SessionRound } from "./domain";
import { plannedRoundCount, suggestedRoundCount } from "./domain";
import {
  buildNextRound,
  currentRound,
  isRoundScored,
  scoredRoundCount,
  sessionCostSplit,
  sessionParticipation,
  sessionStandings,
  startsWithCourtSwap,
} from "./session";
import type { Side } from "./rotation/types";
import { combineStandings, computeStandings, type PlayedRound } from "./standings";

const players = ["ana", "ben", "cleo", "dan"];

function round(index: number, teamA: string[], teamB: string[], winner?: Side): SessionRound {
  return {
    index,
    matches: [{ court: 1, teamA: teamA as [string, string], teamB: teamB as [string, string] }],
    sittingOut: [],
    results: winner ? [{ court: 1, winner }] : [],
  };
}

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "s1",
    date: "2026-07-24",
    playerIds: players,
    courts: 1,
    mode: "americano",
    hours: 2,
    bookings: [{ court: 1, costCents: 4200, hours: 2, ratePerHourCents: 2100 }],
    currency: "EUR",
    rounds: [],
    extras: [],
    status: "active",
    createdAt: "2026-07-24T18:00:00.000Z",
    ...overrides,
  };
}

describe("round progress", () => {
  it("treats a round as scored only once every court has a result", () => {
    expect(isRoundScored(round(0, ["ana", "ben"], ["cleo", "dan"]))).toBe(false);
    expect(isRoundScored(round(0, ["ana", "ben"], ["cleo", "dan"], "A"))).toBe(true);
  });

  it("points at the first unscored round", () => {
    const s = session({
      rounds: [round(0, ["ana", "ben"], ["cleo", "dan"], "A"), round(1, ["ana", "cleo"], ["ben", "dan"])],
    });
    expect(currentRound(s)!.index).toBe(1);
    expect(scoredRoundCount(s)).toBe(1);
  });

  it("has no current round once everything is scored", () => {
    const s = session({ rounds: [round(0, ["ana", "ben"], ["cleo", "dan"], "A")] });
    expect(currentRound(s)).toBeUndefined();
  });
});

describe("building the next round", () => {
  it("follows the fixed Americano schedule regardless of results", () => {
    const first = buildNextRound(session());
    expect(first.index).toBe(0);
    expect(first.matches[0]).toEqual({ court: 1, teamA: ["ana", "ben"], teamB: ["cleo", "dan"] });

    const second = buildNextRound(session({ rounds: [round(0, ["ana", "ben"], ["cleo", "dan"], "A")] }));
    expect(second.matches[0]).toEqual({ court: 1, teamA: ["ana", "cleo"], teamB: ["ben", "dan"] });
  });

  it("re-pairs Mexicano from the standings so far", () => {
    // ana and ben won, so they lead on a point each. Ranking is ana, ben, cleo, dan, which pairs
    // the leader with the tail-ender: 1st+4th against 2nd+3rd.
    const s = session({ mode: "mexicano", rounds: [round(0, ["ana", "ben"], ["cleo", "dan"], "A")] });
    const next = buildNextRound(s);
    expect(next.index).toBe(1);
    expect(next.matches[0]).toEqual({ court: 1, teamA: ["ana", "dan"], teamB: ["ben", "cleo"] });
  });

  it("starts a new round unscored", () => {
    expect(buildNextRound(session()).results).toEqual([]);
  });
});

describe("court swaps", () => {
  const eight = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("flags the round that opens each new block of an 8-player session", () => {
    const s = session({ playerIds: eight, courts: 2 });
    expect([0, 1, 2].map((i) => startsWithCourtSwap(s, i))).toEqual([false, false, false]);
    expect([3, 6, 9].map((i) => startsWithCourtSwap(s, i))).toEqual([true, true, true]);
  });

  it("never flags a swap for smaller sessions or for Mexicano", () => {
    expect(startsWithCourtSwap(session(), 3)).toBe(false);
    expect(startsWithCourtSwap(session({ playerIds: eight, courts: 2, mode: "mexicano" }), 3)).toBe(false);
  });
});

describe("standings", () => {
  it("gives a point to each player on the winning team, ranked by points", () => {
    const s = session({
      rounds: [
        round(0, ["ana", "ben"], ["cleo", "dan"], "A"),
        round(1, ["ana", "cleo"], ["ben", "dan"], "A"),
      ],
    });
    const table = sessionStandings(s);
    // ana wins both, ben and cleo one each (roster order breaks their tie), dan none.
    expect(table.map((r) => r.playerId)).toEqual(["ana", "ben", "cleo", "dan"]);
    expect(table[0]).toMatchObject({ points: 2, losses: 0, roundsPlayed: 2, sitOuts: 0 });
    expect(table[3]).toMatchObject({ points: 0, losses: 2, roundsPlayed: 2 });
  });

  it("ranks a player with fewer losses above one on the same points", () => {
    const table = computeStandings(["ana", "ben"], [
      {
        round: { index: 0, matches: [{ court: 1, teamA: ["ana", "ben"], teamB: ["x", "y"] }], sittingOut: [] },
        results: [{ court: 1, winner: "A" }],
      },
      {
        round: { index: 1, matches: [{ court: 1, teamA: ["ben", "x"], teamB: ["ana", "y"] }], sittingOut: [] },
        results: [{ court: 1, winner: "A" }],
      },
    ] as PlayedRound[]);
    // Both on one point; ana lost her second game, ben didn't play a losing side.
    expect(table.map((r) => r.playerId)).toEqual(["ben", "ana"]);
  });

  it("counts sit-outs, and ignores rounds that haven't been scored yet", () => {
    // An Americano session generates its whole schedule up front, so the second round here is a
    // fixture nobody has played. Counting it would credit ana with a rotation she hasn't played
    // and put a sit-out against eve's name before she's sat.
    const s = session({
      playerIds: ["ana", "ben", "cleo", "dan", "eve"],
      rounds: [
        { index: 0, matches: [{ court: 1, teamA: ["ana", "ben"], teamB: ["cleo", "dan"] }], sittingOut: ["eve"], results: [{ court: 1, winner: "A" }] },
        { index: 1, matches: [{ court: 1, teamA: ["eve", "ana"], teamB: ["ben", "cleo"] }], sittingOut: ["dan"], results: [] },
      ],
    });
    const byId = Object.fromEntries(sessionStandings(s).map((r) => [r.playerId, r]));
    expect(byId.eve).toMatchObject({ sitOuts: 1, roundsPlayed: 0, points: 0 });
    expect(byId.ana).toMatchObject({ sitOuts: 0, roundsPlayed: 1, points: 1 });
    expect(byId.dan).toMatchObject({ sitOuts: 0, roundsPlayed: 1, points: 0, losses: 1 });
  });

  it("aggregates several sessions into an all-time table", () => {
    const one: PlayedRound[] = [
      { round: { index: 0, matches: [{ court: 1, teamA: ["ana", "ben"], teamB: ["cleo", "dan"] }], sittingOut: [] }, results: [{ court: 1, winner: "A" }] },
    ];
    const two: PlayedRound[] = [
      { round: { index: 0, matches: [{ court: 1, teamA: ["cleo", "dan"], teamB: ["ana", "ben"] }], sittingOut: [] }, results: [{ court: 1, winner: "A" }] },
    ];
    const byId = Object.fromEntries(combineStandings(players, [one, two]).map((r) => [r.playerId, r]));
    expect(byId.ana).toMatchObject({ points: 1, losses: 1, roundsPlayed: 2 });
    expect(byId.cleo).toMatchObject({ points: 1, losses: 1, roundsPlayed: 2 });
  });
});

describe("cost", () => {
  it("counts rotations actually played as the split weight", () => {
    const s = session({
      playerIds: ["ana", "ben", "cleo", "dan", "eve"],
      rounds: [
        { index: 0, matches: [{ court: 1, teamA: ["ana", "ben"], teamB: ["cleo", "dan"] }], sittingOut: ["eve"], results: [{ court: 1, winner: "A" }] },
        { index: 1, matches: [{ court: 1, teamA: ["eve", "ana"], teamB: ["ben", "cleo"] }], sittingOut: ["dan"], results: [{ court: 1, winner: "A" }] },
      ],
    });
    expect(sessionParticipation(s)).toEqual([
      { playerId: "ana", roundsPlayed: 2 },
      { playerId: "ben", roundsPlayed: 2 },
      { playerId: "cleo", roundsPlayed: 2 },
      { playerId: "dan", roundsPlayed: 1 },
      { playerId: "eve", roundsPlayed: 1 },
    ]);
  });

  it("doesn't bill anyone for a pre-generated schedule they haven't played", () => {
    // The exact shape that broke it: one round scored, seven more waiting on the schedule.
    const fixture = (index: number) => ({
      index,
      matches: [{ court: 1, teamA: ["ana", "ben"] as [string, string], teamB: ["cleo", "dan"] as [string, string] }],
      sittingOut: [],
      results: [],
    });
    const s = session({
      bookings: [{ court: 1, costCents: 4000, hours: 2 }],
      rounds: [round(0, ["ana", "ben"], ["cleo", "dan"], "A"), ...[1, 2, 3, 4, 5, 6, 7].map(fixture)],
    });

    expect(sessionParticipation(s)).toEqual([
      { playerId: "ana", roundsPlayed: 1 },
      { playerId: "ben", roundsPlayed: 1 },
      { playerId: "cleo", roundsPlayed: 1 },
      { playerId: "dan", roundsPlayed: 1 },
    ]);
    expect(sessionCostSplit(s).perPlayer.map((p) => p.courtShareCents)).toEqual([1000, 1000, 1000, 1000]);
  });

  it("splits the bill end to end, extras included", () => {
    const s = session({
      paidBy: "ana",
      rounds: [
        round(0, ["ana", "ben"], ["cleo", "dan"], "A"),
        round(1, ["ana", "cleo"], ["ben", "dan"], "A"),
      ],
      extras: [{ id: "x1", description: "Beer", costCents: 300, billedTo: ["ben"] }],
    });
    const split = sessionCostSplit(s);

    expect(split.perPlayer.map((p) => p.courtShareCents)).toEqual([1050, 1050, 1050, 1050]);
    expect(split.perPlayer.find((p) => p.playerId === "ben")!.totalCents).toBe(1350);
    expect(split.grandTotalCents).toBe(4500);
    expect(split.settlements).toEqual([
      { from: "ben", to: "ana", amountCents: 1350 },
      { from: "cleo", to: "ana", amountCents: 1050 },
      { from: "dan", to: "ana", amountCents: 1050 },
    ]);
  });
});

describe("planning rounds", () => {
  it.each([
    [2, 8],
    [3, 12],
    [4, 16],
    [1.5, 6],
  ])("suggests %s hours as %i rounds", (hours, rounds) => {
    expect(suggestedRoundCount(hours)).toBe(rounds);
  });

  it("never suggests fewer than one round", () => {
    expect(suggestedRoundCount(0)).toBe(1);
  });

  it("plans whole blocks for 8 players, never fewer than the four it takes to mix everyone", () => {
    expect(plannedRoundCount(8, 2)).toBe(12);
    expect(plannedRoundCount(8, 1)).toBe(12);
    expect(plannedRoundCount(8, 4)).toBe(18);
    expect(plannedRoundCount(8, 3.5)).toBe(15);
  });

  it("leaves smaller sessions on the plain hourly estimate", () => {
    expect(plannedRoundCount(4, 2)).toBe(8);
    expect(plannedRoundCount(5, 3)).toBe(12);
  });
});
