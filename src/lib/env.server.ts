import { requireEnv } from "@/lib/env";

/**
 * Secrets. Only server code may import this file — never a "use client"
 * component, or the values would end up in the browser bundle.
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
