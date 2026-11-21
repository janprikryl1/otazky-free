import { createClient } from "@supabase/supabase-js";

import { serverSupabaseConfig } from "@/lib/env.server";
import type { Database } from "@/lib/types";

let cached: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Service-role client. It bypasses RLS and can therefore read the correct
 * answers, so it must never be imported by client code.
 */
export function supabaseAdmin() {
  if (cached) return cached;

  const { url, serviceRoleKey } = serverSupabaseConfig();

  cached = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "narozeninovy-kviz-server" } },
  });

  return cached;
}
