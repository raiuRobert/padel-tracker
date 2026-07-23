import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Group, NewSession, Player, Session } from "@/lib/domain";
import { newId } from "./ids";
import { NotFoundError, type PadelRepository, type SessionPatch } from "./repository";

const DB_NAME = "padel-tracker";
const DB_VERSION = 1;

interface PadelDB extends DBSchema {
  players: { key: string; value: Player };
  groups: { key: string; value: Group };
  sessions: { key: string; value: Session };
}

function openPadelDb(): Promise<IDBPDatabase<PadelDB>> {
  return openDB<PadelDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("players")) db.createObjectStore("players", { keyPath: "id" });
      if (!db.objectStoreNames.contains("groups")) db.createObjectStore("groups", { keyPath: "id" });
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
    },
  });
}

/**
 * IndexedDB implementation, which is what the app actually runs on. Behaviour is identical to
 * `InMemoryRepository` — both are exercised by the same contract test suite.
 */
export class IndexedDbRepository implements PadelRepository {
  private dbPromise: Promise<IDBPDatabase<PadelDB>> | undefined;

  private db(): Promise<IDBPDatabase<PadelDB>> {
    this.dbPromise ??= openPadelDb();
    return this.dbPromise;
  }

  async listPlayers(): Promise<Player[]> {
    const players = await (await this.db()).getAll("players");
    return players.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createPlayer(name: string): Promise<Player> {
    const player: Player = {
      id: newId(),
      name: name.trim(),
      archived: false,
      createdAt: new Date().toISOString(),
    };
    await (await this.db()).put("players", player);
    return player;
  }

  async renamePlayer(id: string, name: string): Promise<Player> {
    const db = await this.db();
    const existing = await db.get("players", id);
    if (!existing) throw new NotFoundError("player", id);
    const updated = { ...existing, name: name.trim() };
    await db.put("players", updated);
    return updated;
  }

  async deletePlayer(id: string): Promise<void> {
    const db = await this.db();
    const existing = await db.get("players", id);
    if (!existing) throw new NotFoundError("player", id);

    const groups = await db.getAll("groups");
    const affected = groups.filter((group) => group.playerIds.includes(id));
    if (affected.length > 0) {
      const tx = db.transaction("groups", "readwrite");
      await Promise.all([
        ...affected.map((group) =>
          tx.store.put({ ...group, playerIds: group.playerIds.filter((p) => p !== id) }),
        ),
        tx.done,
      ]);
    }

    // Archive rather than delete when there's history to preserve — see PadelRepository.
    const sessions = await db.getAll("sessions");
    if (sessions.some((session) => session.playerIds.includes(id))) {
      await db.put("players", { ...existing, archived: true });
    } else {
      await db.delete("players", id);
    }
  }

  async listGroups(): Promise<Group[]> {
    const groups = await (await this.db()).getAll("groups");
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createGroup(name: string, playerIds: readonly string[]): Promise<Group> {
    const group: Group = {
      id: newId(),
      name: name.trim(),
      playerIds: [...playerIds],
      createdAt: new Date().toISOString(),
    };
    await (await this.db()).put("groups", group);
    return group;
  }

  async updateGroup(id: string, patch: Partial<Pick<Group, "name" | "playerIds">>): Promise<Group> {
    const db = await this.db();
    const existing = await db.get("groups", id);
    if (!existing) throw new NotFoundError("group", id);
    const updated: Group = {
      ...existing,
      ...patch,
      name: (patch.name ?? existing.name).trim(),
      playerIds: [...(patch.playerIds ?? existing.playerIds)],
    };
    await db.put("groups", updated);
    return updated;
  }

  async deleteGroup(id: string): Promise<void> {
    const db = await this.db();
    if (!(await db.get("groups", id))) throw new NotFoundError("group", id);
    await db.delete("groups", id);
  }

  async listSessions(): Promise<Session[]> {
    const sessions = await (await this.db()).getAll("sessions");
    return sessions.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  async getSession(id: string): Promise<Session | undefined> {
    return (await this.db()).get("sessions", id);
  }

  async createSession(input: NewSession): Promise<Session> {
    const session: Session = {
      ...input,
      id: newId(),
      playerIds: [...input.playerIds],
      bookings: [...input.bookings],
      rounds: [],
      extras: [],
      status: "active",
      createdAt: new Date().toISOString(),
    };
    await (await this.db()).put("sessions", session);
    return session;
  }

  async updateSession(id: string, patch: SessionPatch): Promise<Session> {
    const db = await this.db();
    const existing = await db.get("sessions", id);
    if (!existing) throw new NotFoundError("session", id);
    const updated: Session = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt };
    await db.put("sessions", updated);
    return updated;
  }

  async deleteSession(id: string): Promise<void> {
    const db = await this.db();
    if (!(await db.get("sessions", id))) throw new NotFoundError("session", id);
    await db.delete("sessions", id);
  }

  async clear(): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(["players", "groups", "sessions"], "readwrite");
    await Promise.all([
      tx.objectStore("players").clear(),
      tx.objectStore("groups").clear(),
      tx.objectStore("sessions").clear(),
      tx.done,
    ]);
  }
}
