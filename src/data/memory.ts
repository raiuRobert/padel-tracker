import type { Group, NewSession, Player, Session } from "@/lib/domain";
import { newId } from "./ids";
import { NotFoundError, type PadelRepository, type SessionPatch } from "./repository";

/**
 * In-memory implementation. Used by tests and as a safe fallback when IndexedDB isn't available
 * (server rendering, private-mode quirks) so the app never crashes on a missing browser API.
 */
export class InMemoryRepository implements PadelRepository {
  private players = new Map<string, Player>();
  private groups = new Map<string, Group>();
  private sessions = new Map<string, Session>();

  async listPlayers(): Promise<Player[]> {
    return [...this.players.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async createPlayer(name: string): Promise<Player> {
    const player: Player = {
      id: newId(),
      name: name.trim(),
      archived: false,
      createdAt: new Date().toISOString(),
    };
    this.players.set(player.id, player);
    return player;
  }

  async renamePlayer(id: string, name: string): Promise<Player> {
    const existing = this.players.get(id);
    if (!existing) throw new NotFoundError("player", id);
    const updated = { ...existing, name: name.trim() };
    this.players.set(id, updated);
    return updated;
  }

  async deletePlayer(id: string): Promise<void> {
    const existing = this.players.get(id);
    if (!existing) throw new NotFoundError("player", id);

    for (const group of this.groups.values()) {
      if (group.playerIds.includes(id)) {
        this.groups.set(group.id, { ...group, playerIds: group.playerIds.filter((p) => p !== id) });
      }
    }

    const hasHistory = [...this.sessions.values()].some((s) => s.playerIds.includes(id));
    if (hasHistory) {
      this.players.set(id, { ...existing, archived: true });
    } else {
      this.players.delete(id);
    }
  }

  async listGroups(): Promise<Group[]> {
    return [...this.groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async createGroup(name: string, playerIds: readonly string[]): Promise<Group> {
    const group: Group = {
      id: newId(),
      name: name.trim(),
      playerIds: [...playerIds],
      createdAt: new Date().toISOString(),
    };
    this.groups.set(group.id, group);
    return group;
  }

  async updateGroup(id: string, patch: Partial<Pick<Group, "name" | "playerIds">>): Promise<Group> {
    const existing = this.groups.get(id);
    if (!existing) throw new NotFoundError("group", id);
    const updated: Group = {
      ...existing,
      ...patch,
      name: (patch.name ?? existing.name).trim(),
      playerIds: [...(patch.playerIds ?? existing.playerIds)],
    };
    this.groups.set(id, updated);
    return updated;
  }

  async deleteGroup(id: string): Promise<void> {
    if (!this.groups.delete(id)) throw new NotFoundError("group", id);
  }

  async listSessions(): Promise<Session[]> {
    return [...this.sessions.values()].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
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
    this.sessions.set(session.id, session);
    return session;
  }

  async updateSession(id: string, patch: SessionPatch): Promise<Session> {
    const existing = this.sessions.get(id);
    if (!existing) throw new NotFoundError("session", id);
    const updated: Session = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt };
    this.sessions.set(id, updated);
    return updated;
  }

  async upsertSession(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.sessions.delete(id)) throw new NotFoundError("session", id);
  }

  async clear(): Promise<void> {
    this.players.clear();
    this.groups.clear();
    this.sessions.clear();
  }
}
