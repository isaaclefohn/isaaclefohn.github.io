/**
 * Supabase JWT auth for the API.
 *
 * Verifies the caller's access token and returns their user id — the ONLY
 * trustworthy source of identity. Endpoints must derive the user from here,
 * never from the request body, or anyone could act as anyone else.
 *
 * Also exposes the service-role client for privileged server-side reads/writes
 * (it bypasses RLS, so it must never reach the client).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Lazily build the service-role client so importing this file never throws
 *  when env vars are absent (e.g. a build with no secrets configured). */
export function getServiceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Verify a `Bearer <token>` header and return the authenticated user id,
 *  or null if missing/invalid. */
export async function authenticateUser(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const supabase = getServiceClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
