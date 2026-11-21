import { vi } from "vitest";

import { cookieJar } from "@/test/cookie-jar";

process.env.ADMIN_PASSWORD ??= "testovaci-heslo";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service";

/** No Next.js internal throws happen in tests, so this can be a no-op. */
vi.mock("next/navigation", () => ({
  unstable_rethrow: () => {},
}));

/** `connection()` only defers rendering to request time. */
vi.mock("next/server", () => ({
  connection: async () => {},
}));

/** Cookies backed by a plain map so sign-in can be tested. */
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
