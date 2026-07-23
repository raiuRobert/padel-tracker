"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getRepository, type SessionPatch } from "@/data";
import type { Group, NewSession, Player, Session } from "@/lib/domain";

/**
 * One place that owns everything on disk. Every screen reads from here rather than touching the
 * repository directly, so a mutation on one screen is immediately visible on the others without
 * any refetching — and swapping the storage implementation stays invisible to the UI.
 */
interface DataContextValue {
  ready: boolean;
  players: Player[];
  /** Roster minus anyone archived — what a session picker should offer. */
  activePlayers: Player[];
  groups: Group[];
  sessions: Session[];
  playerName: (id: string) => string;
  addPlayer: (name: string) => Promise<void>;
  renamePlayer: (id: string, name: string) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
  addGroup: (name: string, playerIds: readonly string[]) => Promise<void>;
  updateGroup: (id: string, patch: Partial<Pick<Group, "name" | "playerIds">>) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  startSession: (input: NewSession) => Promise<Session>;
  patchSession: (id: string, patch: SessionPatch) => Promise<Session>;
  removeSession: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const reload = useCallback(async () => {
    const repo = getRepository();
    const [nextPlayers, nextGroups, nextSessions] = await Promise.all([
      repo.listPlayers(),
      repo.listGroups(),
      repo.listSessions(),
    ]);
    setPlayers(nextPlayers);
    setGroups(nextGroups);
    setSessions(nextSessions);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const value = useMemo<DataContextValue>(() => {
    const repo = getRepository();
    const nameById = new Map(players.map((p) => [p.id, p.name]));

    return {
      ready,
      players,
      activePlayers: players.filter((p) => !p.archived),
      groups,
      sessions,
      // Archived players still resolve, which is the point of archiving them.
      playerName: (id) => nameById.get(id) ?? "Unknown player",

      addPlayer: async (name) => {
        await repo.createPlayer(name);
        await reload();
      },
      renamePlayer: async (id, name) => {
        await repo.renamePlayer(id, name);
        await reload();
      },
      removePlayer: async (id) => {
        await repo.deletePlayer(id);
        await reload();
      },
      addGroup: async (name, playerIds) => {
        await repo.createGroup(name, playerIds);
        await reload();
      },
      updateGroup: async (id, patch) => {
        await repo.updateGroup(id, patch);
        await reload();
      },
      removeGroup: async (id) => {
        await repo.deleteGroup(id);
        await reload();
      },
      startSession: async (input) => {
        const session = await repo.createSession(input);
        await reload();
        return session;
      },
      patchSession: async (id, patch) => {
        const session = await repo.updateSession(id, patch);
        // Patch in place rather than reloading: score entry happens between points and shouldn't
        // wait on re-reading every session in the database.
        setSessions((current) => current.map((s) => (s.id === id ? session : s)));
        return session;
      },
      removeSession: async (id) => {
        await repo.deleteSession(id);
        await reload();
      },
    };
  }, [ready, players, groups, sessions, reload]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside a DataProvider.");
  return context;
}
