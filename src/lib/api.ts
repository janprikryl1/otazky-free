import { unstable_rethrow } from "next/navigation";

/** Chyba, kterou je bezpečné poslat klientovi (česky). */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

const NETWORK_HINTS =
  /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|getaddrinfo|socket hang up/i;

/**
 * Přeloží chybu z Supabase na srozumitelnou českou hlášku.
 * Technický detail zůstává v serverovém logu.
 */
export function dbError(error: { message: string; code?: string }): ApiError {
  console.error("[supabase]", error);

  if (NETWORK_HINTS.test(error.message)) {
    return new ApiError(
      "Nepodařilo se spojit s databází Supabase. Zkontroluj proměnné NEXT_PUBLIC_SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY.",
      503,
    );
  }

  if (
    error.code === "42P01" ||
    /relation .* does not exist/i.test(error.message)
  ) {
    return new ApiError(
      "V databázi chybí tabulky kvízu. Spusť prosím skript supabase/migrations/0001_init.sql.",
      500,
    );
  }

  if (
    error.code === "42501" ||
    /permission denied|row-level security/i.test(error.message)
  ) {
    return new ApiError(
      "Databáze požadavek odmítla. Server potřebuje klíč SUPABASE_SERVICE_ROLE_KEY (ne anon klíč).",
      500,
    );
  }

  return new ApiError(`Chyba databáze: ${error.message}`, 500);
}

export function jsonOk<T>(data: T, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function jsonError(message: string, status = 400) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** Obalí handler, přeloží vyhozené chyby na JSON odpověď. */
export async function withApi<T>(fn: () => Promise<T>) {
  try {
    return jsonOk(await fn());
  } catch (error) {
    // Interní výjimky Next.js (redirect, notFound, přerušení prerenderu)
    // musí probublat dál – nejsou to chyby aplikace.
    unstable_rethrow(error);

    if (error instanceof ApiError) {
      return jsonError(error.message, error.status);
    }

    console.error("[api] neočekávaná chyba", error);

    const message =
      error instanceof Error && error.message.startsWith("Chybí proměnná")
        ? error.message
        : "Na serveru došlo k neočekávané chybě. Zkus to prosím znovu.";

    return jsonError(message, 500);
  }
}

/** Horní mez pro tělo požadavku – žádný legitimní vstup není větší. */
const MAX_BODY_BYTES = 64 * 1024;

export async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new ApiError("Odeslaná data jsou příliš velká.", 413);
  }

  let raw: string;

  try {
    raw = await request.text();
  } catch {
    throw new ApiError("Požadavek se nepodařilo načíst.", 400);
  }

  if (raw.length > MAX_BODY_BYTES) {
    throw new ApiError("Odeslaná data jsou příliš velká.", 413);
  }

  if (raw.trim() === "") {
    throw new ApiError("Požadavek neobsahuje žádná data.", 400);
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError("Neplatný formát požadavku.", 400);
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiError("Neplatný požadavek.", 400);
  }
  return value as Record<string, unknown>;
}
