import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { adminPassword } from "@/lib/env.server";

export const ADMIN_COOKIE = "kviz_admin";
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hodin

/** One-way token derived from the password. */
function tokenFor(password: string): string {
  return createHmac("sha256", password).update("kviz-admin-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyPassword(candidate: unknown): boolean {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  const expected = adminPassword();
  if (candidate.length !== expected.length) return false;
  return safeEqual(candidate, expected);
}

export async function setAdminCookie() {
  const store = await cookies();

  store.set(ADMIN_COOKIE, tokenFor(adminPassword()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value;
  if (!value) return false;

  try {
    return safeEqual(value, tokenFor(adminPassword()));
  } catch {
    return false;
  }
}
