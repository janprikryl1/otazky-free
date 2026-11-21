import { createClient } from "@supabase/supabase-js";

import { serverSupabaseConfig } from "@/lib/env.server";
import type { Database } from "@/lib/types";

let cached: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Serverový Supabase klient se service-role klíčem.
 * Obchází RLS, takže vidí i otázky včetně správných odpovědí.
 * Smí se používat VÝHRADNĚ v route handlerech / server actions.
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
