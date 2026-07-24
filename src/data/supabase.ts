import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase client, or `null` when it isn't configured.
 *
 * Sync is an enhancement, not a requirement: without the env vars (say, a local checkout with no
 * `.env.local`) the app falls back to working entirely on-device, exactly as it did before. Nothing
 * downstream should assume the client exists — call `getSupabase()` and handle `null`.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    url && anonKey
      ? createClient(url, anonKey, {
          auth: { persistSession: false },
          // A modest cap is plenty — a device only ever watches the session it's looking at.
          realtime: { params: { eventsPerSecond: 5 } },
        })
      : null;
  return client;
}

export function isSyncEnabled(): boolean {
  return getSupabase() !== null;
}
