import type { Group, NewSession, Player, Session } from "@/lib/domain";

/** Everything a session can be updated with after it's been created. */
export type SessionPatch = Partial<Omit<Session, "id" | "createdAt">>;

/**
 * The whole data-access surface, deliberately small.
 *
 * Business logic and UI only ever talk to this interface, so replacing IndexedDB with a real
 * backend later is a matter of writing one more implementation — nothing above it changes.
 * Every method is async for exactly that reason, even where the in-memory version is instant.
 */
export interface PadelRepository {
  /** Includes archived players, so historical sessions can still resolve a name. */
  listPlayers(): Promise<Player[]>;
  createPlayer(name: string): Promise<Player>;
  renamePlayer(id: string, name: string): Promise<Player>;
  /**
   * Removes a player from the roster and from every group. If they've played in a session they're
   * archived rather than deleted, so past results keep their names.
   */
  deletePlayer(id: string): Promise<void>;

  listGroups(): Promise<Group[]>;
  createGroup(name: string, playerIds: readonly string[]): Promise<Group>;
  updateGroup(id: string, patch: Partial<Pick<Group, "name" | "playerIds">>): Promise<Group>;
  deleteGroup(id: string): Promise<void>;

  /** Most recent first. */
  listSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(input: NewSession): Promise<Session>;
  updateSession(id: string, patch: SessionPatch): Promise<Session>;
  deleteSession(id: string): Promise<void>;

  /** Wipes everything. Used by tests and by a "start over" action. */
  clear(): Promise<void>;
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`No ${entity} with id "${id}".`);
    this.name = "NotFoundError";
  }
}
