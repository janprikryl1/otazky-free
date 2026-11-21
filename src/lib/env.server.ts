import { requireEnv } from "@/lib/env";

/**
 * Tajné proměnné prostředí. Tento soubor smí importovat pouze serverový kód
 * (route handlery a moduly ve `src/server`), nikdy komponenta s "use client".
 */
export function serverSupabaseConfig() {
  return {
    url: requireEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    serviceRoleKey: requireEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  };
}

export function adminPassword() {
  return requireEnv("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD);
}
