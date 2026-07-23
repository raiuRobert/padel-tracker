import { describe, expect, it } from "vitest";
import type { Session, SessionRound } from "./domain";
import { suggestedRoundCount } from "./domain";
import {
  buildNextRound,
  currentRound,
  isRoundScored,
  scoredRoundCount,
  sessionCostSplit,
  sessionParticipation,
  sessionStandings,
} from "./session";
import { combineStandings, computeStandings, type PlayedRound } from "./standings";

const players = ["ana", "ben", "cleo", "dan"];

function round(index: number, teamA: string[], teamB: string[], score?: [number, number]): SessionRound {
  return {
    index,
    matches: [{ court: 1, teamA: teamA as [string, string], teamB: teamB as [string, string] }],
    sittingOut: [],
    results: score ? [{ court: 1, teamAGames: score[0], teamBGames: score[1] }] : [],
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
    gamesToWin: 6,
    bookings: [{ court: 1, costCents: 4200, hours: 2 }],
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
    expect(isRoundScored(round(0, ["ana", "ben"], ["cleo", "dan"], [6, 3]))).toBe(true);
  });

  it("points at the first unscored round", () => {
    const s = session({
      rounds: [
        round(0, ["ana", "ben"], ["cleo", "dan"], [6, 3]),
        round(1, ["ana", "cleo"], ["ben", "dan"]),
      ],
    });
    expect(currentRound(s)!.index).toBe(1);
    expect(scoredRoundCount(s)).toBe(1);
  });

  it("has no current round once everything is scored", () => {
    const s = session({ rounds: [round(0, ["ana", "ben"], ["cleo", "dan"], [6, 3])] });
    expect(currentRound(s)).toBeUndefined();
  });
});

describe("building the next round", () => {
  it("follows the fixed Americano schedule regardless of results", () => {
    const first = buildNextRound(session());
    expect(first.index).toBe(0);
    expect(first.matches[0]).toEqual({ court: 1, teamA: ["ana", "ben"], teamB: ["cleo", "dan"] });

    const second = buildNextRound(session({ rounds: [round(0, ["ana", "ben"], ["cleo", "dan"], [6, 0])] }));
    expect(second.matches[0]).toEqual({ court: 1, teamA: ["ana", "cleo"], teamB: ["ben", "dan"] });
  });

  it("re-pairs Mexicano from the standings so far", () => {
    // ana and ben won 6-1, so they lead. Ranking is ana, ben, cleo, dan, which pairs the leader
    // with the tail-ender: 1st+4th against 2nd+3rd.
    const s = session({
      mode: "mexicano",
      rounds: [round(0, ["ana", "ben"], ["cleo", "dan"], [6, 1])],
    });
    const next = buildNextRound(s);
    expect(next.index).toBe(1);
    expect(next.matches[0]).toEqual({ court: 1, teamA: ["ana", "dan"], teamB: ["ben", "cleo"] });
  });

  it("starts a new round unscored", () => {
    expect(buildNextRound(session()).results).toEqual([]);
  });
});

describe("standings", () => {
  it("ranks by games won, then game difference", () => {
    const s = session({
      rounds: [
        round(0, ["ana", "ben"], ["cleo", "dan"], [6, 2]),
        round(1, ["ana", "cleo"], ["ben", "dan"], [6, 4]),
      ],
    });
    // ana wins both (12 games), ben wins then loses (6+4), cleo loses then wins (2+6), dan loses both.
    const table = sessionStandings(s);
    expect(table.map((r) => r.playerId)).toEqual(["ana", "ben", "cleo", "dan"]);

    const ana = table[0];
    expect(ana).toMatchObject({
      gamesWon: 12,
      gamesLost: 6,
      gameDifference: 6,
      roundsPlayed: 2,
      matchesWon: 2,
      matchesLost: 0,
      sitOuts: 0,
    });
  });

  it("counts a drawn rotation for neither side", () => {
    const drawn: PlayedRound[] = [
      {
        round: { index: 0, matches: [{ court: 1, teamA: ["ana", "ben"], teamB: ["cleo", "dan"] }], sittingOut: [] },
        results: [{ court: 1, teamAGames: 5, teamBGames: 5 }],
      },
    ];
    const table = computeStandings(players, drawn);
    expect(table.every((r) => r.matchesWon === 0 && r.matchesLost === 0)).toBe(true);
    expect(table.every((r) => r.gamesWon === 5)).toBe(true);
  });

  it("counts sit-outs, and ignores rounds that haven't been scored yet", () => {
    // An Americano session generates its whole schedule up front, so the second round here is a
    // fixture nobody has played. Counting it would credit ana with a rotation she hasn't played
    // and put a sit-out against eve's name before she's sat.
    const s = session({
      playerIds: ["ana", "ben", "cleo", "dan", "eve"],
      rounds: [
        { index: 0, matches: [{ court: 1, teamA: ["ana", "ben"], teamB: ["cleo", "dan"] }], sittingOut: ["eve"], results: [{ court: 1, teamAGames: 6, teamBGames: 1 }] },
        { index: 1, matches: [{ court: 1, teamA: ["eve", "ana"], teamB: ["ben", "cleo"] }], sittingOut: ["dan"], results: [] },
      ],
    });
    const byId = Object.fromEntries(sessionStandings(s).map((r) => [r.playerId, r]));
    expect(byId.eve).toMatchObject({ sitOuts: 1, roundsPlayed: 0, gamesWon: 0 });
    expect(byId.ana).toMatchObject({ sitOuts: 0, roundsPlayed: 1, gamesWon: 6 });
    expect(byId.dan).toMatchObject({ sitOuts: 0, roundsPlayed: 1 });
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
      rounds: [round(0, ["ana", "ben"], ["cleo", "dan"], [6, 2]), ...[1, 2, 3, 4, 5, 6, 7].map(fixture)],
    });

    expect(sessionParticipation(s)).toEqual([
      { playerId: "ana", roundsPlayed: 1 },
      { playerId: "ben", roundsPlayed: 1 },
      { playerId: "cleo", roundsPlayed: 1 },
      { playerId: "dan", roundsPlayed: 1 },
    ]);
    expect(sessionCostSplit(s).perPlayer.map((p) => p.courtShareCents)).toEqual([1000, 1000, 1000, 1000]);
  });

  it("aggregates several sessions into an all-time table", () => {
    const one: PlayedRound[] = [
      { round: { index: 0, matches: [{ court: 1, teamA: ["ana", "ben"], teamB: ["cleo", "dan"] }], sittingOut: [] }, results: [{ court: 1, teamAGames: 6, teamBGames: 2 }] },
    ];
    const two: PlayedRound[] = [
      { round: { index: 0, matches: [{ court: 1, teamA: ["cleo", "dan"], teamB: ["ana", "ben"] }], sittingOut: [] }, results: [{ court: 1, teamAGames: 6, teamBGames: 3 }] },
    ];
    const table = combineStandings(players, [one, two]);
    const byId = Object.fromEntries(table.map((r) => [r.playerId, r]));
    expect(byId.ana).toMatchObject({ gamesWon: 9, gamesLost: 8, matchesWon: 1, matchesLost: 1, roundsPlayed: 2 });
    expect(byId.cleo).toMatchObject({ gamesWon: 8, gamesLost: 9, matchesWon: 1, matchesLost: 1 });
  });
});

describe("cost", () => {
  it("counts rotations actually played as the split weight", () => {
    const s = session({
      playerIds: ["ana", "ben", "cleo", "dan", "eve"],
      rounds: [
        { index: 0, matches: [{ court: 1, teamA: ["ana", "ben"], teamB: ["cleo", "dan"] }], sittingOut: ["eve"], results: [{ court: 1, teamAGames: 6, teamBGames: 1 }] },
        { index: 1, matches: [{ court: 1, teamA: ["eve", "ana"], teamB: ["ben", "cleo"] }], sittingOut: ["dan"], results: [{ court: 1, teamAGames: 6, teamBGames: 4 }] },
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

  it("splits the bill end to end, extras included", () => {
    const s = session({
      paidBy: "ana",
      rounds: [
        round(0, ["ana", "ben"], ["cleo", "dan"], [6, 2]),
        round(1, ["ana", "cleo"], ["ben", "dan"], [6, 4]),
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

describe("suggestedRoundCount", () => {
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
});
