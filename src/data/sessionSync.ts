import type { Session } from "@/lib/domain";
import type { MatchResult } from "@/lib/standings";
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

function toSession(id: string, data: SessionData): Session {
  return { ...data, id };
}

export async function pushSession(session: Session): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { id, ...data } = session;
  const { error } = await sb.from("sessions").upsert({ id, data });
  if (error) console.warn("padel: failed to push session", error.message);
}

export async function fetchRemoteSession(id: string): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("sessions").select("data").eq("id", id).maybeSingle();
  if (error || !data) return null;
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
  return toSession(id, data as SessionData);
}

/** Calls back with the new session whenever this row changes anywhere. Returns an unsubscribe. */
export function subscribeToSession(id: string, onChange: (session: Session) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};

  const channel = sb
    .channel(`session:${id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "sessions", filter: `id=eq.${id}` },
      (payload) => {
        const row = payload.new as { data?: SessionData } | undefined;
        if (row?.data) onChange(toSession(id, row.data));
      },
    )
    .subscribe();

  return () => {
    void sb.removeChannel(channel);
  };
}
