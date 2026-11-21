/**
 * Veřejné proměnné prostředí – smí je číst i kód v prohlížeči.
 * Serverové (tajné) hodnoty jsou záměrně v samostatném souboru
 * `env.server.ts`, aby se nikdy nedostaly do klientského bundlu.
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
