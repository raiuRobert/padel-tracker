"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getRepository, type SessionPatch } from "@/data";
import {
  applyRoundResults,
  deleteRemoteSession,
  fetchRemoteSession,
  pushSession,
  subscribeToSession,
} from "@/data/sessionSync";
import { isSyncEnabled } from "@/data/supabase";
import type { Group, NewSession, Player, Session } from "@/lib/domain";
import type { MatchResult } from "@/lib/standings";

/**
 * One place that owns everything the app knows. Every screen reads from here rather than touching
 * storage directly, so a mutation on one screen is instantly visible on the others.
 *
 * Players and groups live only on this device. Sessions are shared: the local store is this
 * device's index and offline cache, and Supabase holds the copy everyone edits. Structural changes
 * write the whole document; scores go through a conflict-free RPC. When sync isn't configured, the
 * cloud calls no-op and everything runs on-device exactly as before.
 */
interface DataContextValue {
  ready: boolean;
  syncEnabled: boolean;
  players: Player[];
  /** Roster minus anyone archived — what a session picker should offer. */
  activePlayers: Player[];
  groups: Group[];
  sessions: Session[];
  playerName: (id: string) => string;
  addPlayer: (name: string) => Promise<void>;
  renamePlayer: (id: string, name: string) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
  /** Clears the roster in one go. Anyone with session history is archived, not deleted. */
  removeAllPlayers: () => Promise<void>;
  addGroup: (name: string, playerIds: readonly string[]) => Promise<void>;
  updateGroup: (id: string, patch: Partial<Pick<Group, "name" | "playerIds">>) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  startSession: (input: NewSession) => Promise<Session>;
  patchSession: (id: string, patch: SessionPatch) => Promise<Session>;
  /** Records a round's scores through the conflict-free path, so concurrent scorers don't clobber. */
  recordResults: (id: string, roundIndex: number, results: readonly MatchResult[]) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  /** Pulls a session from the shared backend into this device (opening someone's shared link). */
  joinSession: (id: string) => Promise<Session | null>;
  /** Live-follows a session while a screen is open; returns an unsubscribe. */
  watchSession: (id: string) => () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

/** Sorted the way the lists want it: most recent outing first. */
function byRecency(a: Session, b: Session): number {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
}

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
    return nextSessions;
  }, []);

  /** Caches a session locally and slots it into state (insert or replace, newest first). */
  const applyLocal = useCallback(async (session: Session) => {
    await getRepository().upsertSession(session);
    setSessions((current) => [session, ...current.filter((s) => s.id !== session.id)].sort(byRecency));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const local = await reload();
        // Reconcile with the shared backend: where a session exists remotely that's the shared
        // truth, so cache it; where it doesn't, seed it (created before sync, or while offline).
        if (isSyncEnabled()) {
          for (const session of local) {
            if (cancelled) return;
            const remote = await fetchRemoteSession(session.id);
            if (remote) await getRepository().upsertSession(remote);
            else await pushSession(session);
          }
          if (!cancelled) await reload();
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const addPlayer = useCallback(async (name: string) => {
    await getRepository().createPlayer(name);
    await reload();
  }, [reload]);

  const renamePlayer = useCallback(async (id: string, name: string) => {
    await getRepository().renamePlayer(id, name);
    await reload();
  }, [reload]);

  const removePlayer = useCallback(async (id: string) => {
    await getRepository().deletePlayer(id);
    await reload();
  }, [reload]);

  const removeAllPlayers = useCallback(async () => {
    const repo = getRepository();
    // Goes through deletePlayer one at a time so each player still gets the archive-or-delete
    // decision and the group clean-up, rather than a bulk wipe that would drop names past sessions
    // still need. Reloads once at the end instead of per player.
    const current = await repo.listPlayers();
    for (const player of current) {
      if (!player.archived) await repo.deletePlayer(player.id);
    }
    await reload();
  }, [reload]);

  const addGroup = useCallback(async (name: string, playerIds: readonly string[]) => {
    await getRepository().createGroup(name, playerIds);
    await reload();
  }, [reload]);

  const updateGroup = useCallback(
    async (id: string, patch: Partial<Pick<Group, "name" | "playerIds">>) => {
      await getRepository().updateGroup(id, patch);
      await reload();
    },
    [reload],
  );

  const removeGroup = useCallback(async (id: string) => {
    await getRepository().deleteGroup(id);
    await reload();
  }, [reload]);

  const startSession = useCallback(async (input: NewSession) => {
    const session = await getRepository().createSession(input);
    await pushSession(session);
    await reload();
    return session;
  }, [reload]);

  const patchSession = useCallback(async (id: string, patch: SessionPatch) => {
    const session = await getRepository().updateSession(id, patch);
    // In place rather than a full reload: structural edits happen mid-session and shouldn't wait on
    // re-reading everything.
    setSessions((current) => current.map((s) => (s.id === id ? session : s)));
    await pushSession(session);
    return session;
  }, []);

  const recordResults = useCallback(
    async (id: string, roundIndex: number, results: readonly MatchResult[]) => {
      // The RPC merges by court and hands back the authoritative session, so a score entered here
      // can't overwrite one a friend entered on another court a moment ago.
      const remote = await applyRoundResults(id, roundIndex, results);
      if (remote) {
        await applyLocal(remote);
        return;
      }
      // Sync off or offline: fall back to a local merge into that round's results.
      const repo = getRepository();
      const existing = await repo.getSession(id);
      if (!existing) return;
      const rounds = existing.rounds.map((round) =>
        round.index === roundIndex
          ? {
              ...round,
              results: [
                ...round.results.filter((r) => !results.some((next) => next.court === r.court)),
                ...results,
              ],
            }
          : round,
      );
      const updated = await repo.updateSession(id, { rounds });
      setSessions((current) => current.map((s) => (s.id === id ? updated : s)));
    },
    [applyLocal],
  );

  const removeSession = useCallback(async (id: string) => {
    await getRepository().deleteSession(id);
    await deleteRemoteSession(id);
    await reload();
  }, [reload]);

  const joinSession = useCallback(
    async (id: string) => {
      const repo = getRepository();
      const session = (await fetchRemoteSession(id)) ?? (await repo.getSession(id)) ?? null;
      if (session) await applyLocal(session);
      return session;
    },
    [applyLocal],
  );

  const watchSession = useCallback(
    (id: string) => subscribeToSession(id, (session) => void applyLocal(session)),
    [applyLocal],
  );

  const value = useMemo<DataContextValue>(() => {
    // Names resolve from every session's participant snapshot first — so a shared session opened
    // here shows names even without those players in the local roster — then the local roster wins
    // for anyone it does know, keeping renames current.
    const nameById = new Map<string, string>();
    for (const session of sessions) {
      for (const participant of session.participants ?? []) nameById.set(participant.id, participant.name);
    }
    for (const player of players) nameById.set(player.id, player.name);

    return {
      ready,
      syncEnabled: isSyncEnabled(),
      players,
      activePlayers: players.filter((p) => !p.archived),
      groups,
      sessions,
      playerName: (id) => nameById.get(id) ?? "—",
      addPlayer,
      renamePlayer,
      removePlayer,
      removeAllPlayers,
      addGroup,
      updateGroup,
      removeGroup,
      startSession,
      patchSession,
      recordResults,
      removeSession,
      joinSession,
      watchSession,
    };
  }, [
    ready,
    players,
    groups,
    sessions,
    addPlayer,
    renamePlayer,
    removePlayer,
    removeAllPlayers,
    addGroup,
    updateGroup,
    removeGroup,
    startSession,
    patchSession,
    recordResults,
    removeSession,
    joinSession,
    watchSession,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside a DataProvider.");
  return context;
}
