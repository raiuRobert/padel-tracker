import type { Session } from "@/lib/domain";
import type { MatchResult } from "@/lib/standings";
import { migrateSession } from "./migrate";
import { getSupabase } from "./supabase";

/**
 * The shared-backend side of sessions.
 *
 * A session is stored as one JSONB document keyed by its id — the id being the share secret. The
 * local IndexedDB cache remains each device's index of which sessions it knows; this module is only
 * the read/write/subscribe channel to the copy everyone shares. Every function no-ops (returning
 * null / a no-op unsubscribe) when sync isn't configured, so callers never special-case it.
 */

/** The stored row: id is a column, everything else is the session document. */
type SessionData = Omit<Session, "id">;

/**
 * Documents arrive from whatever build the device that wrote them is running, which can be an older
 * one than this — a friend who hasn't reloaded the app in a while. Same treatment as a session read
 * off this device's own storage: bring it up to the current shape rather than trusting it.
 */
function toSession(id: string, data: SessionData): Session {
  return migrateSession({ ...data, id });
}

/**
 * The newest `updated_at` this device has applied, per session.
 *
 * Realtime delivers changes, but not a guarantee that they arrive in the order they were written.
 * A device that scores a round and then immediately writes the next one can see the echo of the
 * *first* write land after the second, which would roll its own state backwards — losing the round
 * that was just added and leaving the session looking finished. Every write is stamped by the
 * database, so comparing stamps is enough to drop anything that isn't news.
 *
 * Server timestamps only: nothing here compares a client clock to a server one.
 */
const lastApplied = new Map<string, string>();

/** True when this row is newer than whatever we last took for that session. */
function isNews(id: string, updatedAt: string | undefined): boolean {
  if (!updatedAt) return true;
  const seen = lastApplied.get(id);
  if (seen && updatedAt <= seen) return false;
  lastApplied.set(id, updatedAt);
  return true;
}

export async function pushSession(session: Session): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { id, ...data } = session;
  // Ask for the new stamp back so our own write can't later be undone by its own echo.
  const { data: row, error } = await sb
    .from("sessions")
    .upsert({ id, data })
    .select("updated_at")
    .maybeSingle();
  if (error) {
    console.warn("padel: failed to push session", error.message);
    return;
  }
  if (row?.updated_at) isNews(id, row.updated_at as string);
}

export async function fetchRemoteSession(id: string): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("sessions").select("data, updated_at").eq("id", id).maybeSingle();
  if (error || !data) return null;
  isNews(id, data.updated_at as string);
  return toSession(id, data.data as SessionData);
}

export async function deleteRemoteSession(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("sessions").delete().eq("id", id);
  if (error) console.warn("padel: failed to delete remote session", error.message);
}

/**
 * Records a round's results through the conflict-free RPC, which merges by court under a row lock —
 * so two people scoring different courts of the same round don't overwrite each other. Returns the
 * authoritative session the backend produced, or null when sync is off (the caller then writes
 * locally instead).
 */
export async function applyRoundResults(
  id: string,
  roundIndex: number,
  results: readonly MatchResult[],
): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("set_round_results", {
    p_session_id: id,
    p_round_index: roundIndex,
    p_results: results,
  });
  if (error || !data) {
    if (error) console.warn("padel: failed to record results", error.message);
    return null;
  }
  const { data: document, updatedAt } = data as { data: SessionData; updatedAt: string };
  isNews(id, updatedAt);
  return toSession(id, document);
}

/**
 * Calls back with the new session whenever this row changes anywhere. Returns an unsubscribe.
 *
 * Changes that are older than something already applied are dropped rather than handed on — see
 * `lastApplied`.
 */
export function subscribeToSession(id: string, onChange: (session: Session) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};

  const channel = sb
    .channel(`session:${id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "sessions", filter: `id=eq.${id}` },
      (payload) => {
        const row = payload.new as { data?: SessionData; updated_at?: string } | undefined;
        if (row?.data && isNews(id, row.updated_at)) onChange(toSession(id, row.data));
      },
    )
    .subscribe();

  return () => {
    void sb.removeChannel(channel);
  };
}
