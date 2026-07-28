import { describe, expect, it } from "vitest";
import { splitCosts, type CostSplitOptions } from "./split";
import { CostSplitError } from "./types";

const players = ["ana", "ben", "cleo", "dan"];

/** A two-hour, single-court session at €42, everyone playing the full set of rotations. */
function baseline(overrides: Partial<CostSplitOptions> = {}): CostSplitOptions {
  return {
    players,
    bookings: [{ court: 1, costCents: 4200, hours: 2 }],
    participation: players.map((playerId) => ({ playerId, roundsPlayed: 6 })),
    ...overrides,
  };
}

const totalsByPlayer = (split: ReturnType<typeof splitCosts>) =>
  Object.fromEntries(split.perPlayer.map((p) => [p.playerId, p.totalCents]));

describe("court cost", () => {
  it("splits evenly when everyone played the same number of rotations", () => {
    const split = splitCosts(baseline());
    expect(split.perPlayer.map((p) => p.courtShareCents)).toEqual([1050, 1050, 1050, 1050]);
    expect(split.courtCostCents).toBe(4200);
  });

  it("charges less to someone who left early", () => {
    const split = splitCosts(
      baseline({
        participation: [
          { playerId: "ana", roundsPlayed: 6 },
          { playerId: "ben", roundsPlayed: 6 },
          { playerId: "cleo", roundsPlayed: 6 },
          { playerId: "dan", roundsPlayed: 3 },
        ],
      }),
    );
    expect(split.perPlayer.map((p) => p.courtShareCents)).toEqual([1200, 1200, 1200, 600]);
  });

  it("charges someone who played half as many rotations exactly half as much", () => {
    const split = splitCosts(
      baseline({
        bookings: [{ court: 1, costCents: 5600, hours: 2 }],
        participation: [
          { playerId: "ana", roundsPlayed: 8 },
          { playerId: "ben", roundsPlayed: 8 },
          { playerId: "cleo", roundsPlayed: 8 },
          { playerId: "dan", roundsPlayed: 4 },
        ],
      }),
    );
    const byPlayer = Object.fromEntries(split.perPlayer.map((p) => [p.playerId, p.courtShareCents]));
    expect(byPlayer).toEqual({ ana: 1600, ben: 1600, cleo: 1600, dan: 800 });
  });

  it("keeps a half-session share within a cent of half, even when it can't divide evenly", () => {
    const split = splitCosts(
      baseline({
        bookings: [{ court: 1, costCents: 6000, hours: 2 }],
        participation: [
          { playerId: "ana", roundsPlayed: 8 },
          { playerId: "ben", roundsPlayed: 8 },
          { playerId: "cleo", roundsPlayed: 8 },
          { playerId: "dan", roundsPlayed: 4 },
        ],
      }),
    );
    const byPlayer = Object.fromEntries(split.perPlayer.map((p) => [p.playerId, p.courtShareCents]));
    // 6000c over 28 rotation-shares doesn't divide cleanly; the stray cent has to land somewhere.
    expect(Math.abs(byPlayer.dan * 2 - byPlayer.ana)).toBeLessThanOrEqual(1);
    expect(split.perPlayer.reduce((sum, p) => sum + p.courtShareCents, 0)).toBe(6000);
  });

  it("charges nothing to someone who never made it onto court", () => {
    const split = splitCosts(
      baseline({
        participation: [
          { playerId: "ana", roundsPlayed: 6 },
          { playerId: "ben", roundsPlayed: 6 },
          { playerId: "cleo", roundsPlayed: 6 },
          { playerId: "dan", roundsPlayed: 0 },
        ],
      }),
    );
    expect(split.perPlayer.find((p) => p.playerId === "dan")!.courtShareCents).toBe(0);
  });

  it("pools two courts booked for different lengths of time", () => {
    const split = splitCosts(
      baseline({
        players: ["ana", "ben", "cleo", "dan", "eve", "finn", "gus", "hana"],
        bookings: [
          { court: 1, costCents: 4200, hours: 2 },
          { court: 2, costCents: 6300, hours: 3 },
        ],
        participation: ["ana", "ben", "cleo", "dan", "eve", "finn", "gus", "hana"].map((playerId) => ({
          playerId,
          roundsPlayed: 6,
        })),
      }),
    );
    expect(split.courtCostCents).toBe(10500);
    expect(split.totalHours).toBe(5);
    expect(split.perPlayer.every((p) => p.courtShareCents === 1312 || p.courtShareCents === 1313)).toBe(true);
  });

  it("falls back to an even split when nobody has played a rotation yet", () => {
    const split = splitCosts(
      baseline({ participation: players.map((playerId) => ({ playerId, roundsPlayed: 0 })) }),
    );
    expect(split.perPlayer.map((p) => p.courtShareCents)).toEqual([1050, 1050, 1050, 1050]);
  });

  it("treats a player missing from participation as having played nothing", () => {
    const split = splitCosts(
      baseline({ participation: [{ playerId: "ana", roundsPlayed: 4 }, { playerId: "ben", roundsPlayed: 4 }] }),
    );
    expect(totalsByPlayer(split)).toEqual({ ana: 2100, ben: 2100, cleo: 0, dan: 0 });
  });

  it("always has the shares add up to exactly the bill", () => {
    for (const costCents of [1, 999, 4200, 5000, 7777, 12345]) {
      for (const rounds of [
        [6, 6, 6, 6],
        [7, 5, 3, 1],
        [1, 1, 1, 0],
        [9, 9, 9, 2],
      ]) {
        const split = splitCosts(
          baseline({
            bookings: [{ court: 1, costCents, hours: 2 }],
            participation: players.map((playerId, i) => ({ playerId, roundsPlayed: rounds[i] })),
          }),
        );
        expect(
          split.perPlayer.reduce((sum, p) => sum + p.courtShareCents, 0),
          `${costCents}c across ${JSON.stringify(rounds)}`,
        ).toBe(costCents);
      }
    }
  });
});

describe("an even court split", () => {
  /** Someone who played half as much as everyone else — the case the two rules disagree on. */
  const uneven = [
    { playerId: "ana", roundsPlayed: 8 },
    { playerId: "ben", roundsPlayed: 8 },
    { playerId: "cleo", roundsPlayed: 8 },
    { playerId: "dan", roundsPlayed: 4 },
  ];

  it("charges everyone the same however much they played", () => {
    const split = splitCosts(baseline({ participation: uneven, courtSplit: "even" }));
    expect(split.perPlayer.map((p) => p.courtShareCents)).toEqual([1050, 1050, 1050, 1050]);
  });

  it("still charges someone who never made it onto court", () => {
    const split = splitCosts(
      baseline({
        courtSplit: "even",
        participation: [...players.slice(0, 3).map((playerId) => ({ playerId, roundsPlayed: 6 })), {
          playerId: "dan",
          roundsPlayed: 0,
        }],
      }),
    );
    expect(split.perPlayer.find((p) => p.playerId === "dan")!.courtShareCents).toBe(1050);
  });

  it("splits by time played when no rule is given, so old sessions bill as they always did", () => {
    const byDefault = splitCosts(baseline({ participation: uneven }));
    const explicit = splitCosts(baseline({ participation: uneven, courtSplit: "rotations" }));
    expect(byDefault.perPlayer).toEqual(explicit.perPlayer);
    expect(byDefault.perPlayer.map((p) => p.courtShareCents)).toEqual([1200, 1200, 1200, 600]);
  });

  it("leaves extras billed to whoever had them", () => {
    const split = splitCosts(
      baseline({
        courtSplit: "even",
        participation: uneven,
        extras: [{ id: "x1", description: "Beer", costCents: 350, billedTo: ["ben"] }],
      }),
    );
    expect(totalsByPlayer(split)).toEqual({ ana: 1050, ben: 1400, cleo: 1050, dan: 1050 });
  });

  it("always has the shares add up to exactly the bill", () => {
    for (const costCents of [1, 999, 4200, 4201, 7777, 12345]) {
      const split = splitCosts(baseline({ bookings: [{ court: 1, costCents, hours: 2 }], courtSplit: "even" }));
      expect(
        split.perPlayer.reduce((sum, p) => sum + p.courtShareCents, 0),
        `${costCents}c split evenly`,
      ).toBe(costCents);
    }
  });
});

describe("extras", () => {
  it("bills an extra to the one person who had it", () => {
    const split = splitCosts(
      baseline({
        extras: [{ id: "x1", description: "Beer", costCents: 350, billedTo: ["ben"] }],
      }),
    );
    expect(totalsByPlayer(split)).toEqual({ ana: 1050, ben: 1400, cleo: 1050, dan: 1050 });
    expect(split.extrasCostCents).toBe(350);
    expect(split.grandTotalCents).toBe(4550);
  });

  it("splits an extra across a chosen subset, not the whole session", () => {
    const split = splitCosts(
      baseline({
        extras: [{ id: "x1", description: "Crisps", costCents: 300, billedTo: ["ana", "cleo"] }],
      }),
    );
    expect(totalsByPlayer(split)).toEqual({ ana: 1200, ben: 1050, cleo: 1200, dan: 1050 });
  });

  it("itemises each extra so the breakdown explains the total", () => {
    const split = splitCosts(
      baseline({
        extras: [
          { id: "x1", description: "Beer", costCents: 350, billedTo: ["ben"] },
          { id: "x2", description: "Water", costCents: 200, billedTo: ["ben", "dan"] },
        ],
      }),
    );
    const ben = split.perPlayer.find((p) => p.playerId === "ben")!;
    expect(ben.extras).toEqual([
      { extraId: "x1", description: "Beer", shareCents: 350 },
      { extraId: "x2", description: "Water", shareCents: 100 },
    ]);
    expect(ben.extrasCents).toBe(450);
    expect(ben.courtShareCents + ben.extrasCents).toBe(ben.totalCents);
  });

  it("splits an indivisible extra without losing or inventing a cent", () => {
    const split = splitCosts(
      baseline({
        extras: [{ id: "x1", description: "Balls", costCents: 1000, billedTo: ["ana", "ben", "cleo"] }],
      }),
    );
    const shares = split.perPlayer.map((p) => p.extrasCents);
    expect(shares).toEqual([334, 333, 333, 0]);
    expect(shares.reduce((sum, s) => sum + s, 0)).toBe(1000);
  });

  it("keeps court cost and extras reported separately", () => {
    const split = splitCosts(
      baseline({ extras: [{ id: "x1", description: "Beer", costCents: 350, billedTo: ["ben"] }] }),
    );
    expect(split.courtCostCents).toBe(4200);
    expect(split.extrasCostCents).toBe(350);
    expect(split.grandTotalCents).toBe(split.courtCostCents + split.extrasCostCents);
  });
});

describe("settling up", () => {
  it("has everyone pay the person who fronted the court", () => {
    const split = splitCosts(baseline({ paidBy: "ana" }));
    expect(split.settlements).toEqual([
      { from: "ben", to: "ana", amountCents: 1050 },
      { from: "cleo", to: "ana", amountCents: 1050 },
      { from: "dan", to: "ana", amountCents: 1050 },
    ]);
    expect(split.perPlayer.find((p) => p.playerId === "ana")!.netCents).toBe(-3150);
  });

  it("credits someone who fronted an extra on top of the court payer", () => {
    const split = splitCosts(
      baseline({
        paidBy: "ana",
        extras: [{ id: "x1", description: "Beer", costCents: 300, billedTo: ["cleo"], paidBy: "ben" }],
      }),
    );
    expect(split.settlements).toEqual([
      { from: "cleo", to: "ana", amountCents: 1350 },
      { from: "dan", to: "ana", amountCents: 1050 },
      { from: "ben", to: "ana", amountCents: 750 },
    ]);
  });

  it("bills extras to the court payer by default", () => {
    const split = splitCosts(
      baseline({
        paidBy: "ana",
        extras: [{ id: "x1", description: "Beer", costCents: 300, billedTo: ["cleo"] }],
      }),
    );
    expect(split.perPlayer.find((p) => p.playerId === "ana")!.paidCents).toBe(4500);
  });

  it("leaves every balance at zero once the settlements are paid", () => {
    const split = splitCosts(
      baseline({
        paidBy: "ana",
        participation: [
          { playerId: "ana", roundsPlayed: 6 },
          { playerId: "ben", roundsPlayed: 4 },
          { playerId: "cleo", roundsPlayed: 6 },
          { playerId: "dan", roundsPlayed: 1 },
        ],
        extras: [
          { id: "x1", description: "Beer", costCents: 375, billedTo: ["ben", "dan"] },
          { id: "x2", description: "Balls", costCents: 900, billedTo: players, paidBy: "dan" },
        ],
      }),
    );
    const net = new Map(split.perPlayer.map((p) => [p.playerId, p.netCents]));
    for (const { from, to, amountCents } of split.settlements) {
      net.set(from, net.get(from)! - amountCents);
      net.set(to, net.get(to)! + amountCents);
    }
    expect([...net.values()]).toEqual([0, 0, 0, 0]);
  });

  it("suggests no transfers when nobody has fronted anything yet", () => {
    expect(splitCosts(baseline()).settlements).toEqual([]);
  });
});

describe("validation", () => {
  it("rejects an empty session", () => {
    expect(() => splitCosts(baseline({ players: [], participation: [] }))).toThrow(CostSplitError);
  });

  it("rejects duplicate players", () => {
    expect(() => splitCosts(baseline({ players: ["ana", "ana", "ben", "cleo"] }))).toThrow(/duplicate/i);
  });

  it("rejects a negative court cost", () => {
    expect(() => splitCosts(baseline({ bookings: [{ court: 1, costCents: -100, hours: 2 }] }))).toThrow(
      CostSplitError,
    );
  });

  it("rejects an extra billed to nobody", () => {
    expect(() =>
      splitCosts(baseline({ extras: [{ id: "x1", description: "Beer", costCents: 350, billedTo: [] }] })),
    ).toThrow(/at least one player/i);
  });

  it("rejects an extra billed to someone outside the session", () => {
    expect(() =>
      splitCosts(baseline({ extras: [{ id: "x1", description: "Beer", costCents: 350, billedTo: ["zoe"] }] })),
    ).toThrow(/isn't in this session/i);
  });

  it("rejects a payer outside the session", () => {
    expect(() => splitCosts(baseline({ paidBy: "zoe" }))).toThrow(/isn't in this session/i);
  });

  it("rejects negative rounds played", () => {
    expect(() =>
      splitCosts(baseline({ participation: [{ playerId: "ana", roundsPlayed: -1 }] })),
    ).toThrow(CostSplitError);
  });
});
