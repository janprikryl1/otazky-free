import { vi } from "vitest";

import { cookieJar } from "@/test/cookie-jar";

process.env.ADMIN_PASSWORD ??= "testovaci-heslo";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service";

/**
 * `unstable_rethrow` propouští dál interní výjimky Next.js. V testech
 * žádné nevznikají, takže stačí nedělat nic.
 */
vi.mock("next/navigation", () => ({
  unstable_rethrow: () => {},
}));

/** `connection()` jen odkládá renderování na čas požadavku. */
vi.mock("next/server", () => ({
  connection: async () => {},
}));

/** Cookies nahrazené jednoduchou mapou, ať jde testovat přihlášení. */
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name)
        ? { name, value: cookieJar.get(name) as string }
        : undefined,
    getAll: () =>
      [...cookieJar.entries()].map(([name, value]) => ({ name, value })),
    has: (name: string) => cookieJar.has(name),
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
    toString: () =>
      [...cookieJar.entries()]
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
  }),
}));
