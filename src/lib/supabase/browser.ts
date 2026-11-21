"use client";

import { createClient } from "@supabase/supabase-js";

import { publicSupabaseConfig } from "@/lib/env";
import type { Database } from "@/lib/types";

let cached: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Klient pro prohlížeč (anon klíč). Používá se pouze pro Supabase Realtime
 * – tedy pro odběr změn na tabulkách `game_sessions` a `players`.
 * Veškerá herní logika i data o otázkách jdou přes /api route handlery.
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
