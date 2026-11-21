import { describe, expect, it, vi } from "vitest";

import {
  ApiError,
  asRecord,
  dbError,
  jsonError,
  readJson,
  withApi,
} from "@/lib/api";

function request(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://test.local/api", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

describe("readJson", () => {
  it("přečte platné JSON tělo", async () => {
    await expect(readJson(request('{"pin":"123456"}'))).resolves.toEqual({
      pin: "123456",
    });
  });

  it("odmítne nečitelné JSON", async () => {
    await expect(readJson(request("{tohle není json"))).rejects.toMatchObject({
      status: 400,
      message: "Neplatný formát požadavku.",
    });
  });

  it("odmítne prázdné tělo", async () => {
    await expect(readJson(request("   "))).rejects.toMatchObject({
      status: 400,
      message: "Požadavek neobsahuje žádná data.",
    });
  });

  it("odmítne příliš velké tělo podle hlavičky", async () => {
    await expect(
      readJson(request("{}", { "content-length": String(10 * 1024 * 1024) })),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("odmítne příliš velké tělo i bez hlavičky", async () => {
    const huge = JSON.stringify({ nickname: "a".repeat(100_000) });

    await expect(readJson(request(huge))).rejects.toMatchObject({
      status: 413,
    });
  });
});

describe("asRecord", () => {
  it("propustí objekt", () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
  });

  it("odmítne pole, null i skalární hodnoty", () => {
    for (const value of [[1, 2], null, "text", 42, true]) {
      expect(() => asRecord(value)).toThrow(ApiError);
    }
  });
});

describe("dbError", () => {
  it("výpadek spojení přeloží na srozumitelnou radu", () => {
    const error = dbError({ message: "TypeError: fetch failed" });

    expect(error.status).toBe(503);
    expect(error.message).toContain("Nepodařilo se spojit s databází");
    expect(error.message).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("chybějící tabulky pošlou uživatele na migraci", () => {
    const error = dbError({
      code: "42P01",
      message: 'relation "public.quizzes" does not exist',
    });

    expect(error.message).toContain("0001_init.sql");
  });

  it("zamítnutí přes RLS poradí se service-role klíčem", () => {
    const error = dbError({ code: "42501", message: "permission denied" });

    expect(error.message).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("technický detail zaloguje, ale nezatají", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = dbError({ code: "23503", message: "foreign key violation" });

    expect(spy).toHaveBeenCalled();
    expect(error.message).toContain("foreign key violation");
    expect(error.status).toBe(500);
  });
});

describe("withApi", () => {
  it("zabalí úspěšný výsledek a zakáže cachování", async () => {
    const response = await withApi(async () => ({ ok: true }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("přeloží ApiError na jeho stavový kód a českou hlášku", async () => {
    const response = await withApi(async () => {
      throw new ApiError("Hra nebyla nalezena.", 404);
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Hra nebyla nalezena.",
    });
  });

  it("u neočekávané chyby neprozradí vnitřnosti serveru", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await withApi(async () => {
      throw new Error(
        "connect ECONNREFUSED 10.0.0.1:5432 user=postgres password=tajne",
      );
    });

    expect(response.status).toBe(500);
    const data = (await response.json()) as { error: string };

    expect(data.error).toBe(
      "Na serveru došlo k neočekávané chybě. Zkus to prosím znovu.",
    );
    expect(data.error).not.toContain("password");
    expect(data.error).not.toContain("ECONNREFUSED");
    // detail se ale musí objevit v serverovém logu
    expect(spy).toHaveBeenCalled();
  });

  it("chybějící proměnnou prostředí naopak ukáže, aby šla opravit", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await withApi(async () => {
      throw new Error("Chybí proměnná prostředí ADMIN_PASSWORD.");
    });

    const data = (await response.json()) as { error: string };
    expect(data.error).toContain("ADMIN_PASSWORD");
  });
});

describe("jsonError", () => {
  it("vrátí chybu v očekávaném tvaru", async () => {
    const response = jsonError("Nesprávné heslo.", 401);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Nesprávné heslo.",
    });
  });
});
