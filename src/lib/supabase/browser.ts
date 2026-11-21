"use client";

import { createClient } from "@supabase/supabase-js";

import { publicSupabaseConfig } from "@/lib/env";
import type { Database } from "@/lib/types";

let cached: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Browser client, used only to subscribe to Realtime changes on
 * `game_sessions` and `players`. Everything else goes through /api.
 */
export function supabaseBrowser() {
  if (cached) return cached;

  const { url, anonKey } = publicSupabaseConfig();

  cached = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });

  return cached;
}
