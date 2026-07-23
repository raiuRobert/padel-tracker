import { describe, expect, it } from "vitest";
import { allocate, fromCents, settle, toCents } from "./money";
import { CostSplitError } from "./types";

describe("toCents / fromCents", () => {
  it.each([
    [12.34, 1234],
    [24.5, 2450],
    [0.29, 29],
    [0, 0],
    [100, 10000],
    [12.345, 1235],
  ])("converts %s to %i cents", (amount, cents) => {
    expect(toCents(amount)).toBe(cents);
  });

  it("round-trips back to currency units", () => {
    expect(fromCents(toCents(42.75))).toBe(42.75);
  });

  it("rejects values that aren't finite numbers", () => {
    expect(() => toCents(Number.NaN)).toThrow(CostSplitError);
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow(CostSplitError);
  });
});

describe("allocate", () => {
  it("splits evenly when weights match", () => {
    expect(allocate(4000, [1, 1, 1, 1])).toEqual([1000, 1000, 1000, 1000]);
  });

  it("gives leftover cents to whoever was rounded down hardest", () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(1000, [1, 1, 1, 1, 1, 1])).toEqual([167, 167, 167, 167, 166, 166]);
  });

  it("splits in proportion to the weights", () => {
    expect(allocate(1000, [3, 1])).toEqual([750, 250]);
    expect(allocate(4200, [6, 6, 6, 3])).toEqual([1200, 1200, 1200, 600]);
  });

  it("charges nobody nothing when the total is zero", () => {
    expect(allocate(0, [5, 3, 1])).toEqual([0, 0, 0]);
  });

  it("falls back to an even split when nobody has any weight", () => {
    expect(allocate(1000, [0, 0, 0, 0])).toEqual([250, 250, 250, 250]);
    expect(allocate(100, [0, 0, 0])).toEqual([34, 33, 33]);
  });

  it("gives zero to anyone who didn't play, when others did", () => {
    expect(allocate(900, [1, 1, 1, 0])).toEqual([300, 300, 300, 0]);
  });

  it("always sums to exactly the total, however awkward the numbers", () => {
    const totals = [1, 7, 99, 100, 101, 2350, 4999, 123457];
    const weightSets = [
      [1, 1, 1],
      [1, 1, 1, 1, 1],
      [7, 3],
      [5, 5, 3, 2, 1, 1],
      [1, 2, 3, 4, 5, 6, 7, 8],
      [0, 0, 1],
      [11, 0, 0, 0],
    ];
    for (const total of totals) {
      for (const weights of weightSets) {
        const shares = allocate(total, weights);
        expect(
          shares.reduce((sum, share) => sum + share, 0),
          `total ${total} across ${JSON.stringify(weights)}`,
        ).toBe(total);
        expect(shares).toHaveLength(weights.length);
      }
    }
  });

  it("handles an empty roster", () => {
    expect(allocate(1000, [])).toEqual([]);
  });

  it("rejects negative weights and fractional totals", () => {
    expect(() => allocate(100, [1, -1])).toThrow(CostSplitError);
    expect(() => allocate(10.5, [1, 1])).toThrow(CostSplitError);
  });
});

describe("settle", () => {
  it("sends everyone to the single person who fronted the money", () => {
    expect(
      settle([
        { playerId: "p1", netCents: -3000 },
        { playerId: "p2", netCents: 1000 },
        { playerId: "p3", netCents: 1000 },
        { playerId: "p4", netCents: 1000 },
      ]),
    ).toEqual([
      { from: "p2", to: "p1", amountCents: 1000 },
      { from: "p3", to: "p1", amountCents: 1000 },
      { from: "p4", to: "p1", amountCents: 1000 },
    ]);
  });

  it("splits a debt across two people who are owed", () => {
    expect(
      settle([
        { playerId: "p1", netCents: -1500 },
        { playerId: "p2", netCents: -500 },
        { playerId: "p3", netCents: 2000 },
      ]),
    ).toEqual([
      { from: "p3", to: "p1", amountCents: 1500 },
      { from: "p3", to: "p2", amountCents: 500 },
    ]);
  });

  it("settles every balance to zero", () => {
    const balances = [
      { playerId: "p1", netCents: -3000 },
      { playerId: "p2", netCents: -700 },
      { playerId: "p3", netCents: 1300 },
      { playerId: "p4", netCents: 2400 },
    ];
    const settlements = settle(balances);
    const net = new Map(balances.map((b) => [b.playerId, b.netCents]));
    for (const { from, to, amountCents } of settlements) {
      net.set(from, net.get(from)! - amountCents);
      net.set(to, net.get(to)! + amountCents);
    }
    expect([...net.values()]).toEqual([0, 0, 0, 0]);
  });

  it("produces nothing when nobody fronted anything", () => {
    expect(settle([{ playerId: "p1", netCents: 0 }, { playerId: "p2", netCents: 0 }])).toEqual([]);
  });
});
