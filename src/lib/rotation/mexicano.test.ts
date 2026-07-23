import { describe, expect, it } from "vitest";
import { emptyTallies, mexicanoRound } from "./mexicano";
import { seededRandom } from "./random";
import type { Match, PlayerId, PlayerTally, Round } from "./types";
import { RotationConfigError } from "./validation";
import { computeTallies, type PlayedRound } from "../standings";
import { expectFairSitOuts, expectWellFormedRounds, roster, sitOutCounts } from "./test-utils";

/** Tallies where `order[0]` leads and each subsequent player trails by 5 games. */
function standingsIn(order: readonly PlayerId[]): PlayerTally[] {
  return order.map((playerId, i) => ({
    playerId,
    gamesWon: (order.length - i) * 5,
    gamesLost: i * 5,
    roundsPlayed: 1,
    sitOuts: 0,
  }));
}

/** Plays a full session forward, feeding each round's result back into the next round's pairing. */
function simulate(
  players: readonly PlayerId[],
  courts: number,
  roundCount: number,
  score: (match: Match, index: number) => { teamAGames: number; teamBGames: number } = () => ({
    teamAGames: 6,
    teamBGames: 4,
  }),
): Round[] {
  const played: PlayedRound[] = [];
  const rounds: Round[] = [];
  for (let index = 0; index < roundCount; index++) {
    const round = mexicanoRound({ players, courts, index, tallies: computeTallies(players, played) });
    rounds.push(round);
    played.push({
      round,
      results: round.matches.map((match) => ({ court: match.court, ...score(match, index) })),
    });
  }
  return rounds;
}

describe("Mexicano — opening round", () => {
  it("pairs on roster order when there are no standings yet", () => {
    const players = roster(4);
    const round = mexicanoRound({ players, courts: 1, index: 0, tallies: emptyTallies(players) });
    expect(round.matches[0].teamA).toEqual(["p1", "p4"]);
    expect(round.matches[0].teamB).toEqual(["p2", "p3"]);
  });

  it("works with no tallies supplied at all", () => {
    const players = roster(4);
    expect(mexicanoRound({ players, courts: 1, index: 0 })).toEqual(
      mexicanoRound({ players, courts: 1, index: 0, tallies: emptyTallies(players) }),
    );
  });

  it("scrambles the opening round when given a source of randomness", () => {
    const players = roster(4);
    const fixed = mexicanoRound({ players, courts: 1, index: 0 });
    const shuffled = Array.from({ length: 20 }, (_, seed) =>
      mexicanoRound({ players, courts: 1, index: 0, random: seededRandom(seed) }),
    );

    expectWellFormedRounds(shuffled, players, 1);
    expect(shuffled.some((round) => round.matches[0].teamA.join() !== fixed.matches[0].teamA.join())).toBe(true);
  });

  it("ignores randomness after the opening round", () => {
    const players = roster(4);
    const withRandom = mexicanoRound({ players, courts: 1, index: 1, random: seededRandom(7) });
    const without = mexicanoRound({ players, courts: 1, index: 1 });
    expect(withRandom).toEqual(without);
  });
});

describe("Mexicano — standings-based pairing", () => {
  it("pairs 1st with 4th against 2nd with 3rd", () => {
    const players = roster(4);
    const round = mexicanoRound({
      players,
      courts: 1,
      index: 1,
      tallies: standingsIn(["p3", "p1", "p4", "p2"]),
    });
    expect(round.matches[0].teamA).toEqual(["p3", "p2"]);
    expect(round.matches[0].teamB).toEqual(["p1", "p4"]);
  });

  it("re-pairs as the standings change", () => {
    const players = roster(4);
    const first = mexicanoRound({ players, courts: 1, index: 1, tallies: standingsIn(players) });
    const reversed = mexicanoRound({ players, courts: 1, index: 2, tallies: standingsIn([...players].reverse()) });
    expect(first.matches[0].teamA).toEqual(["p1", "p4"]);
    expect(reversed.matches[0].teamA).toEqual(["p4", "p1"]);
  });

  it("breaks ties on games conceded, then roster order", () => {
    const players = roster(4);
    const tallies: PlayerTally[] = [
      { playerId: "p1", gamesWon: 10, gamesLost: 8, roundsPlayed: 2, sitOuts: 0 },
      { playerId: "p2", gamesWon: 10, gamesLost: 2, roundsPlayed: 2, sitOuts: 0 },
      { playerId: "p3", gamesWon: 4, gamesLost: 6, roundsPlayed: 2, sitOuts: 0 },
      { playerId: "p4", gamesWon: 4, gamesLost: 6, roundsPlayed: 2, sitOuts: 0 },
    ];
    // Ranking: p2 (10 won, 2 lost), p1 (10 won, 8 lost), then p3 before p4 on roster order.
    const round = mexicanoRound({ players, courts: 1, index: 1, tallies });
    expect(round.matches[0].teamA).toEqual(["p2", "p4"]);
    expect(round.matches[0].teamB).toEqual(["p1", "p3"]);
  });

  it("splits 8 players so the top four share a court and the bottom four share the other", () => {
    const players = roster(8);
    const round = mexicanoRound({ players, courts: 2, index: 1, tallies: standingsIn(players) });

    expect(round.matches[0]).toEqual({ court: 1, teamA: ["p1", "p4"], teamB: ["p2", "p3"] });
    expect(round.matches[1]).toEqual({ court: 2, teamA: ["p5", "p8"], teamB: ["p6", "p7"] });
    expect(round.sittingOut).toEqual([]);
  });

  it("ranks only the players still on court when someone sits out", () => {
    const players = roster(5);
    // p1 has already sat once, so the four with zero sit-outs play and p2 (top of those) leads.
    const tallies: PlayerTally[] = [
      { playerId: "p1", gamesWon: 30, gamesLost: 0, roundsPlayed: 1, sitOuts: 0 },
      { playerId: "p2", gamesWon: 20, gamesLost: 5, roundsPlayed: 1, sitOuts: 1 },
      { playerId: "p3", gamesWon: 15, gamesLost: 8, roundsPlayed: 1, sitOuts: 1 },
      { playerId: "p4", gamesWon: 10, gamesLost: 9, roundsPlayed: 1, sitOuts: 1 },
      { playerId: "p5", gamesWon: 5, gamesLost: 12, roundsPlayed: 1, sitOuts: 1 },
    ];
    const round = mexicanoRound({ players, courts: 1, index: 1, tallies });

    expect(round.sittingOut).toEqual(["p1"]);
    expect(round.matches[0].teamA).toEqual(["p2", "p5"]);
    expect(round.matches[0].teamB).toEqual(["p3", "p4"]);
  });
});

describe("Mexicano — sit-out fairness", () => {
  it("sits exactly one player per round with 5 players", () => {
    const players = roster(5);
    const rounds = simulate(players, 1, 15);
    expectWellFormedRounds(rounds, players, 1);
    for (const round of rounds) expect(round.sittingOut).toHaveLength(1);
  });

  it("gives everyone exactly one sit-out per 5 rounds with 5 players", () => {
    const players = roster(5);
    const rounds = simulate(players, 1, 15);
    for (const start of [0, 5, 10]) {
      const counts = sitOutCounts(rounds.slice(start, start + 5), players);
      expect([...counts.values()], `rounds ${start}-${start + 4}`).toEqual([1, 1, 1, 1, 1]);
    }
  });

  it("sits two players per round with 6 players and cycles them every 3 rounds", () => {
    const players = roster(6);
    const rounds = simulate(players, 1, 12);
    expectWellFormedRounds(rounds, players, 1);
    for (const round of rounds) expect(round.sittingOut).toHaveLength(2);
    for (const start of [0, 3, 6, 9]) {
      const counts = sitOutCounts(rounds.slice(start, start + 3), players);
      expect([...counts.values()], `rounds ${start}-${start + 2}`).toEqual([1, 1, 1, 1, 1, 1]);
    }
  });

  it("never repeats a sit-out before everyone has sat, whatever the scores do", () => {
    for (const [count, courts] of [
      [4, 1],
      [5, 1],
      [6, 1],
      [8, 2],
    ] as const) {
      const players = roster(count);
      // Lopsided scores that would skew any score-driven sideline selection.
      const rounds = simulate(players, courts, 20, (_match, index) => ({
        teamAGames: 6,
        teamBGames: index % 3,
      }));
      expectFairSitOuts(rounds, players);
    }
  });

  it("benches a runaway leader on schedule rather than protecting them", () => {
    const players = roster(5);
    // p1 wins every game they play by a mile; they must still sit as often as everyone else.
    const rounds = simulate(players, 1, 10, (match) => ({
      teamAGames: match.teamA.includes("p1") ? 6 : 0,
      teamBGames: match.teamA.includes("p1") ? 0 : 6,
    }));
    const counts = sitOutCounts(rounds, players);
    expect([...counts.values()]).toEqual([2, 2, 2, 2, 2]);
  });
});

describe("Mexicano — validation", () => {
  it.each([
    [4, 2],
    [6, 2],
    [8, 1],
    [7, 1],
  ])("rejects %i players on %i court(s)", (count, courts) => {
    expect(() => mexicanoRound({ players: roster(count), courts, index: 0 })).toThrow(RotationConfigError);
  });

  it("rejects a negative round index", () => {
    expect(() => mexicanoRound({ players: roster(4), courts: 1, index: -1 })).toThrow(RotationConfigError);
  });

  it("rejects a roster with duplicate players", () => {
    expect(() => mexicanoRound({ players: ["a", "b", "c", "a"], courts: 1, index: 0 })).toThrow(/duplicate/i);
  });
});
