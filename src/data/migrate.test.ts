import { describe, expect, it } from "vitest";
import type { Session } from "@/lib/domain";
import { migrateSession } from "./migrate";

/** A session as an older build would have written it, with game scores and a games-to-win setting. */
function legacySession(results: unknown[]): Session {
  return {
    id: "s1",
    date: "2026-07-24",
    playerIds: ["ana", "ben", "cleo", "dan"],
    courts: 1,
    mode: "americano",
    hours: 2,
    gamesToWin: 6,
    bookings: [{ court: 1, costCents: 4200, hours: 2 }],
    rounds: [
      {
        index: 0,
        matches: [{ court: 1, teamA: ["ana", "ben"], teamB: ["cleo", "dan"] }],
        sittingOut: [],
        results,
      },
    ],
    extras: [],
    status: "active",
    createdAt: "2026-07-24T18:00:00.000Z",
  } as unknown as Session;
}

describe("migrateSession", () => {
  it("turns a winning game score into a winning side", () => {
    const migrated = migrateSession(legacySession([{ court: 1, teamAGames: 6, teamBGames: 3 }]));
    expect(migrated.rounds[0].results).toEqual([{ court: 1, winner: "A" }]);
  });

  it("reads the winner from whichever side scored more", () => {
    const migrated = migrateSession(legacySession([{ court: 1, teamAGames: 2, teamBGames: 6 }]));
    expect(migrated.rounds[0].results).toEqual([{ court: 1, winner: "B" }]);
  });

  it("drops a drawn round rather than inventing a winner", () => {
    // Draws were possible under game scoring and can't be represented now, so the round goes back
    // to being unscored and can simply be re-entered.
    const migrated = migrateSession(legacySession([{ court: 1, teamAGames: 5, teamBGames: 5 }]));
    expect(migrated.rounds[0].results).toEqual([]);
  });

  it("removes the games-to-win setting", () => {
    const migrated = migrateSession(legacySession([{ court: 1, teamAGames: 6, teamBGames: 3 }]));
    expect("gamesToWin" in migrated).toBe(false);
  });

  it("defaults a currency-less session to euros", () => {
    const migrated = migrateSession(legacySession([{ court: 1, winner: "A" }]));
    expect(migrated.currency).toBe("EUR");
  });

  it("leaves a session that already has a currency in that currency", () => {
    const current = { ...legacySession([{ court: 1, winner: "B" }]), currency: "RON" } as Session;
    delete (current as Session & { gamesToWin?: number }).gamesToWin;
    expect(migrateSession(current).currency).toBe("RON");
  });

  it("leaves an already-migrated session untouched", () => {
    const current: Session = { ...legacySession([{ court: 1, winner: "B" }]), currency: "EUR" } as Session;
    delete (current as Session & { gamesToWin?: number }).gamesToWin;

    expect(migrateSession(current)).toBe(current);
  });

  it("keeps an unscored round unscored", () => {
    const migrated = migrateSession(legacySession([]));
    expect(migrated.rounds[0].results).toEqual([]);
  });

  it("preserves everything else about the session", () => {
    const migrated = migrateSession(legacySession([{ court: 1, teamAGames: 6, teamBGames: 3 }]));
    expect(migrated).toMatchObject({
      id: "s1",
      playerIds: ["ana", "ben", "cleo", "dan"],
      bookings: [{ court: 1, costCents: 4200, hours: 2 }],
      status: "active",
    });
    expect(migrated.rounds[0].matches).toEqual([
      { court: 1, teamA: ["ana", "ben"], teamB: ["cleo", "dan"] },
    ]);
  });
});
