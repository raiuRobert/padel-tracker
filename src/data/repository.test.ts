import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { NewSession } from "@/lib/domain";
import { IndexedDbRepository } from "./indexeddb";
import { InMemoryRepository } from "./memory";
import { NotFoundError, type PadelRepository } from "./repository";

/**
 * One contract, both implementations. Anything the app relies on is asserted here, so a future
 * backend-backed repository can be dropped in and validated by running the same suite against it.
 */
function newSession(playerIds: readonly string[], overrides: Partial<NewSession> = {}): NewSession {
  return {
    date: "2026-07-24",
    playerIds,
    courts: 1,
    mode: "americano",
    hours: 2,
    bookings: [{ court: 1, costCents: 4200, hours: 2 }],
    ...overrides,
  };
}

function contractSuite(name: string, create: () => PadelRepository) {
  describe(name, () => {
    let repo: PadelRepository;

    beforeEach(async () => {
      repo = create();
      await repo.clear();
    });

    describe("players", () => {
      it("creates and lists players alphabetically", async () => {
        await repo.createPlayer("Zoe");
        await repo.createPlayer("Ana");
        expect((await repo.listPlayers()).map((p) => p.name)).toEqual(["Ana", "Zoe"]);
      });

      it("trims whitespace off names", async () => {
        const player = await repo.createPlayer("  Ben  ");
        expect(player.name).toBe("Ben");
      });

      it("creates players unarchived with an id and timestamp", async () => {
        const player = await repo.createPlayer("Ana");
        expect(player.archived).toBe(false);
        expect(player.id).toBeTruthy();
        expect(Number.isNaN(Date.parse(player.createdAt))).toBe(false);
      });

      it("renames a player", async () => {
        const player = await repo.createPlayer("Ana");
        const renamed = await repo.renamePlayer(player.id, "Ana B");
        expect(renamed.name).toBe("Ana B");
        expect((await repo.listPlayers())[0].name).toBe("Ana B");
      });

      it("deletes a player who has never played", async () => {
        const player = await repo.createPlayer("Ana");
        await repo.deletePlayer(player.id);
        expect(await repo.listPlayers()).toEqual([]);
      });

      it("archives rather than deletes a player with session history", async () => {
        const players = await Promise.all(["Ana", "Ben", "Cleo", "Dan"].map((n) => repo.createPlayer(n)));
        await repo.createSession(newSession(players.map((p) => p.id)));

        await repo.deletePlayer(players[0].id);

        const remaining = await repo.listPlayers();
        expect(remaining).toHaveLength(4);
        expect(remaining.find((p) => p.id === players[0].id)!.archived).toBe(true);
      });

      it("removes a deleted player from every group", async () => {
        const ana = await repo.createPlayer("Ana");
        const ben = await repo.createPlayer("Ben");
        const group = await repo.createGroup("Tuesdays", [ana.id, ben.id]);

        await repo.deletePlayer(ana.id);

        expect((await repo.listGroups()).find((g) => g.id === group.id)!.playerIds).toEqual([ben.id]);
      });

      it("reports an unknown player", async () => {
        await expect(repo.renamePlayer("nope", "X")).rejects.toThrow(NotFoundError);
        await expect(repo.deletePlayer("nope")).rejects.toThrow(NotFoundError);
      });
    });

    describe("groups", () => {
      it("creates and lists groups alphabetically", async () => {
        await repo.createGroup("Weekend", []);
        await repo.createGroup("Tuesdays", []);
        expect((await repo.listGroups()).map((g) => g.name)).toEqual(["Tuesdays", "Weekend"]);
      });

      it("updates a group's name and members independently", async () => {
        const group = await repo.createGroup("Tuesdays", ["a", "b"]);

        const renamed = await repo.updateGroup(group.id, { name: "Tuesday regulars" });
        expect(renamed.playerIds).toEqual(["a", "b"]);

        const remembered = await repo.updateGroup(group.id, { playerIds: ["a", "b", "c"] });
        expect(remembered.name).toBe("Tuesday regulars");
        expect(remembered.playerIds).toEqual(["a", "b", "c"]);
      });

      it("deletes a group", async () => {
        const group = await repo.createGroup("Tuesdays", []);
        await repo.deleteGroup(group.id);
        expect(await repo.listGroups()).toEqual([]);
      });

      it("reports an unknown group", async () => {
        await expect(repo.updateGroup("nope", { name: "X" })).rejects.toThrow(NotFoundError);
        await expect(repo.deleteGroup("nope")).rejects.toThrow(NotFoundError);
      });
    });

    describe("sessions", () => {
      const playerIds = ["p1", "p2", "p3", "p4"];

      it("creates a session with no rounds, no extras and active status", async () => {
        const session = await repo.createSession(newSession(playerIds));
        expect(session.rounds).toEqual([]);
        expect(session.extras).toEqual([]);
        expect(session.status).toBe("active");
        expect(session.playerIds).toEqual(playerIds);
        expect(session.mode).toBe("americano");
      });

      it("round-trips a session through storage", async () => {
        const created = await repo.createSession(newSession(playerIds));
        expect(await repo.getSession(created.id)).toEqual(created);
      });

      it("patches a session without touching its id or creation time", async () => {
        const created = await repo.createSession(newSession(playerIds));
        const updated = await repo.updateSession(created.id, {
          status: "finished",
          rounds: [
            {
              index: 0,
              matches: [{ court: 1, teamA: ["p1", "p2"], teamB: ["p3", "p4"] }],
              sittingOut: [],
              results: [{ court: 1, winner: "A" }],
            },
          ],
        });

        expect(updated.id).toBe(created.id);
        expect(updated.createdAt).toBe(created.createdAt);
        expect(updated.status).toBe("finished");
        expect(updated.rounds[0].results[0].winner).toBe("A");
        expect(updated.hours).toBe(2);
      });

      it("persists extras added mid-session", async () => {
        const created = await repo.createSession(newSession(playerIds));
        await repo.updateSession(created.id, {
          extras: [{ id: "x1", description: "Beer", costCents: 350, billedTo: ["p2"] }],
        });
        expect((await repo.getSession(created.id))!.extras).toEqual([
          { id: "x1", description: "Beer", costCents: 350, billedTo: ["p2"] },
        ]);
      });

      it("lists sessions most recent first", async () => {
        await repo.createSession(newSession(playerIds, { date: "2026-07-01" }));
        await repo.createSession(newSession(playerIds, { date: "2026-07-24" }));
        await repo.createSession(newSession(playerIds, { date: "2026-07-10" }));
        expect((await repo.listSessions()).map((s) => s.date)).toEqual([
          "2026-07-24",
          "2026-07-10",
          "2026-07-01",
        ]);
      });

      it("returns undefined for an unknown session", async () => {
        expect(await repo.getSession("nope")).toBeUndefined();
      });

      it("deletes a session", async () => {
        const created = await repo.createSession(newSession(playerIds));
        await repo.deleteSession(created.id);
        expect(await repo.listSessions()).toEqual([]);
      });

      it("reports an unknown session on update and delete", async () => {
        await expect(repo.updateSession("nope", { status: "finished" })).rejects.toThrow(NotFoundError);
        await expect(repo.deleteSession("nope")).rejects.toThrow(NotFoundError);
      });
    });

    it("clears everything", async () => {
      await repo.createPlayer("Ana");
      await repo.createGroup("Tuesdays", []);
      await repo.createSession(newSession(["p1", "p2", "p3", "p4"]));

      await repo.clear();

      expect(await repo.listPlayers()).toEqual([]);
      expect(await repo.listGroups()).toEqual([]);
      expect(await repo.listSessions()).toEqual([]);
    });
  });
}

contractSuite("InMemoryRepository", () => new InMemoryRepository());
contractSuite("IndexedDbRepository", () => new IndexedDbRepository());
