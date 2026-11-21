/**
 * Public environment values, safe to read in the browser. Secrets live in
 * `env.server.ts` so they cannot be pulled into the client bundle.
 */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Chybí proměnná prostředí ${name}. Zkopíruj .env.example do .env.local a doplň hodnoty (viz README.md).`,
    );
  }
  return value.trim();
}

export function publicSupabaseConfig() {
  return {
    url: requireEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    anonKey: requireEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}
