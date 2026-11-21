import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BASE_POINTS, MAX_SPEED_BONUS } from "@/lib/game";
import { FakeSupabase, resetTestUuids } from "@/test/fake-supabase";
import { playerRow, seedPlayer, seedQuiz, sessionRow } from "@/test/fixtures";

let db: FakeSupabase;

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => db,
}));

const { POST: join } = await import("@/app/api/game/join/route");
const { POST: answer } = await import("@/app/api/game/answer/route");
const { GET: state } = await import("@/app/api/game/state/route");
const { createSession, startGame, revealQuestion } = await import(
  "@/server/game-flow"
);

const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

function post(body: unknown): Request {
  return new Request("http://test.local/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function stateRequest(query: Record<string, string>): NextRequest {
  const url = new URL("http://test.local/api/game/state");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return { nextUrl: url } as unknown as NextRequest;
}

async function body<T = Record<string, unknown>>(
  response: Response,
): Promise<T> {
  return (await response.json()) as T;
}

beforeEach(() => {
  db = new FakeSupabase();
  resetTestUuids();
});

/** Připraví hru s jedním hráčem v čekárně. */
async function lobby() {
  const quizId = seedQuiz(db);
  const session = await createSession(quizId);
  return session;
}

describe("POST /api/game/join", () => {
  it("připojí hráče a vrátí jeho identifikátory", async () => {
    const session = await lobby();

    const response = await join(
      post({ pin: session.pin, nickname: "Verunka" }),
    );
    const data = await body<{
      playerId: string;
      nickname: string;
      sessionId: string;
    }>(response);

    expect(response.status).toBe(200);
    expect(data.nickname).toBe("Verunka");
    expect(data.sessionId).toBe(session.id);
    expect(sessionRow(db, session.id).player_count).toBe(1);
  });

  it("očistí přezdívku od přebytečných mezer", async () => {
    const session = await lobby();

    const data = await body<{ nickname: string }>(
      await join(post({ pin: session.pin, nickname: "  Josef   P.  " })),
    );

    expect(data.nickname).toBe("Josef P.");
  });

  it("odmítne prázdnou přezdívku i tu z neviditelných znaků", async () => {
    const session = await lobby();

    for (const nickname of ["", "   ", "​​", "\n"]) {
      const response = await join(post({ pin: session.pin, nickname }));
      expect(response.status).toBe(400);
      expect((await body<{ error: string }>(response)).error).toContain(
        "přezdívku",
      );
    }

    expect(db.tables.players).toHaveLength(0);
  });

  it("odmítne příliš dlouhou přezdívku", async () => {
    const session = await lobby();

    const response = await join(
      post({ pin: session.pin, nickname: "a".repeat(25) }),
    );

    expect(response.status).toBe(400);
  });

  it("odmítne už obsazenou přezdívku bez ohledu na velikost písmen", async () => {
    const session = await lobby();
    await join(post({ pin: session.pin, nickname: "Verunka" }));

    const response = await join(
      post({ pin: session.pin, nickname: "verunka" }),
    );

    expect(response.status).toBe(409);
    expect((await body<{ error: string }>(response)).error).toContain(
      "už někdo používá",
    );
    expect(db.tables.players).toHaveLength(1);
  });

  it("dovolí stejnou přezdívku ve dvou různých hrách", async () => {
    const first = await lobby();
    const second = await createSession(seedQuiz(db));

    expect(
      (await join(post({ pin: first.pin, nickname: "Josef" }))).status,
    ).toBe(200);
    expect(
      (await join(post({ pin: second.pin, nickname: "Josef" }))).status,
    ).toBe(200);
  });

  it("odmítne neplatný PIN dřív, než sáhne do databáze", async () => {
    for (const pin of ["12345", "abcdef", "", "1234567", null, 123456]) {
      const response = await join(post({ pin, nickname: "Verunka" }));
      expect(response.status).toBe(400);
      expect((await body<{ error: string }>(response)).error).toContain(
        "šest číslic",
      );
    }
  });

  it("vrátí 404 pro neexistující PIN", async () => {
    const response = await join(post({ pin: "000001", nickname: "Verunka" }));

    expect(response.status).toBe(404);
    expect((await body<{ error: string }>(response)).error).toContain(
      "nenašli",
    );
  });

  it("nepustí hráče do dohrané hry", async () => {
    const session = await lobby();
    sessionRow(db, session.id).status = "finished";

    const response = await join(post({ pin: session.pin, nickname: "Pozdní" }));

    expect(response.status).toBe(409);
    expect((await body<{ error: string }>(response)).error).toContain(
      "už skončila",
    );
  });

  it("pustí hráče i do rozehrané hry", async () => {
    const session = await lobby();
    seedPlayer(db, session.id, "Anna");
    await startGame(session.id);

    expect(
      (await join(post({ pin: session.pin, nickname: "Opozdilec" }))).status,
    ).toBe(200);
  });

  it("odmítne nečitelné i prázdné tělo požadavku", async () => {
    expect((await join(post("{nevalidni json"))).status).toBe(400);
    expect((await join(post(""))).status).toBe(400);
    expect((await join(post([1, 2, 3]))).status).toBe(400);
    expect((await join(post("null"))).status).toBe(400);
  });
});

describe("POST /api/game/answer", () => {
  async function runningGame() {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    const player = seedPlayer(db, session.id, "Verunka");
    await startGame(session.id);
    return { session: sessionRow(db, session.id), playerId: player };
  }

  it("přijme odpověď a nic o správnosti neprozradí", async () => {
    const { session, playerId } = await runningGame();

    const response = await answer(
      post({ sessionId: session.id, playerId, optionIndex: 0 }),
    );
    const data = await body<Record<string, unknown>>(response);

    expect(response.status).toBe(200);
    expect(data).toEqual({ accepted: true, optionIndex: 0 });
    expect(Object.keys(data)).not.toContain("isCorrect");
    expect(Object.keys(data)).not.toContain("points");
  });

  it("dá za okamžitou správnou odpověď plný počet bodů", async () => {
    const { session, playerId } = await runningGame();

    await answer(post({ sessionId: session.id, playerId, optionIndex: 0 }));

    const stored = db.tables.answers[0];
    expect(stored.is_correct).toBe(true);
    expect(Number(stored.points)).toBeGreaterThan(BASE_POINTS + 450);
    expect(Number(stored.points)).toBeLessThanOrEqual(
      BASE_POINTS + MAX_SPEED_BONUS,
    );
  });

  it("dá za špatnou odpověď nula bodů", async () => {
    const { session, playerId } = await runningGame();

    await answer(post({ sessionId: session.id, playerId, optionIndex: 1 }));

    expect(db.tables.answers[0].is_correct).toBe(false);
    expect(db.tables.answers[0].points).toBe(0);
  });

  it("dá méně bodů tomu, kdo odpoví později", async () => {
    const { session, playerId } = await runningGame();
    const pomaly = seedPlayer(db, session.id as string, "Pomalý");

    await answer(post({ sessionId: session.id, playerId, optionIndex: 0 }));

    // posuneme začátek otázky o 15 s do minulosti
    session.question_started_at = new Date(Date.now() - 15_000).toISOString();
    await answer(
      post({ sessionId: session.id, playerId: pomaly, optionIndex: 0 }),
    );

    const [rychla, pozdni] = db.tables.answers;
    expect(Number(pozdni.points)).toBeLessThan(Number(rychla.points));
    expect(Number(pozdni.points)).toBeGreaterThanOrEqual(BASE_POINTS);
  });

  it("nedovolí odpovědět dvakrát", async () => {
    const { session, playerId } = await runningGame();

    await answer(post({ sessionId: session.id, playerId, optionIndex: 0 }));
    const response = await answer(
      post({ sessionId: session.id, playerId, optionIndex: 1 }),
    );

    expect(response.status).toBe(409);
    expect((await body<{ error: string }>(response)).error).toContain(
      "už jsi odpověděl",
    );
    expect(db.tables.answers).toHaveLength(1);
    expect(db.tables.answers[0].option_index).toBe(0);
  });

  it("odmítne odpověď po vypršení času", async () => {
    const { session, playerId } = await runningGame();
    session.question_ends_at = new Date(Date.now() - 10_000).toISOString();

    const response = await answer(
      post({ sessionId: session.id, playerId, optionIndex: 0 }),
    );

    expect(response.status).toBe(409);
    expect((await body<{ error: string }>(response)).error).toContain(
      "Čas na odpověď vypršel",
    );
  });

  it("promine odpověď, která dorazí o chlup pozdě kvůli síti", async () => {
    const { session, playerId } = await runningGame();
    session.question_ends_at = new Date(Date.now() - 500).toISOString();

    expect(
      (await answer(post({ sessionId: session.id, playerId, optionIndex: 0 })))
        .status,
    ).toBe(200);
  });

  it("odmítne odpověď ve fázi vyhodnocení", async () => {
    const { session, playerId } = await runningGame();
    await revealQuestion(session.id as string);

    const response = await answer(
      post({ sessionId: session.id, playerId, optionIndex: 0 }),
    );

    expect(response.status).toBe(409);
    expect((await body<{ error: string }>(response)).error).toContain(
      "uzavřené",
    );
  });

  it("odmítne možnost mimo rozsah otázky", async () => {
    const { session, playerId } = await runningGame();

    for (const optionIndex of [-1, 4, 99]) {
      const response = await answer(
        post({ sessionId: session.id, playerId, optionIndex }),
      );
      expect(response.status).toBe(400);
    }

    expect(db.tables.answers).toHaveLength(0);
  });

  it("odmítne nečíselný index odpovědi", async () => {
    const { session, playerId } = await runningGame();

    for (const optionIndex of ["0", 1.5, null, {}, Number.NaN]) {
      const response = await answer(
        post({ sessionId: session.id, playerId, optionIndex }),
      );
      expect(response.status).toBe(400);
    }
  });

  it("odmítne neplatné identifikátory", async () => {
    const { session, playerId } = await runningGame();

    expect(
      (await answer(post({ sessionId: "neco", playerId, optionIndex: 0 })))
        .status,
    ).toBe(400);

    expect(
      (
        await answer(
          post({ sessionId: session.id, playerId: "neco", optionIndex: 0 }),
        )
      ).status,
    ).toBe(400);
  });

  it("nedovolí odpovídat za hráče z jiné hry", async () => {
    const { session } = await runningGame();
    const other = await createSession(seedQuiz(db));
    const cizi = seedPlayer(db, other.id, "Cizinec");

    const response = await answer(
      post({ sessionId: session.id, playerId: cizi, optionIndex: 0 }),
    );

    expect(response.status).toBe(403);
    expect(db.tables.answers).toHaveLength(0);
  });

  it("vrátí 404 pro neexistující hru", async () => {
    const response = await answer(
      post({ sessionId: UUID, playerId: UUID, optionIndex: 0 }),
    );

    expect(response.status).toBe(404);
  });
});

describe("GET /api/game/state", () => {
  it("funguje podle PINu ještě před připojením hráče", async () => {
    const session = await lobby();

    const data = await body<{
      session: { pin: string; status: string };
      me: unknown;
    }>(await state(stateRequest({ pin: session.pin })));

    expect(data.session.pin).toBe(session.pin);
    expect(data.session.status).toBe("lobby");
    expect(data.me).toBeNull();
  });

  it("během otázky neprozradí správnou odpověď", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    const player = seedPlayer(db, session.id, "Verunka");
    await startGame(session.id);

    const response = await state(
      stateRequest({ pin: session.pin, playerId: player }),
    );
    const raw = await response.text();
    const data = JSON.parse(raw);

    expect(data.question.options).toHaveLength(4);
    expect(data.question).not.toHaveProperty("correctIndex");
    expect(data.reveal).toBeNull();
    // ani nikde jinde v odpovědi se správná odpověď neobjeví
    expect(raw).not.toContain("correctIndex");
    expect(raw).not.toContain("correctOption");
  });

  it("ve vyhodnocení ukáže správnou odpověď, body i pořadí", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    const anna = seedPlayer(db, session.id, "Anna");
    const bob = seedPlayer(db, session.id, "Bob");
    await startGame(session.id);

    await answer(
      post({ sessionId: session.id, playerId: anna, optionIndex: 0 }),
    );
    await answer(
      post({ sessionId: session.id, playerId: bob, optionIndex: 1 }),
    );
    await revealQuestion(session.id);

    const data = await body<{
      reveal: {
        correctIndex: number;
        correctOption: string;
        counts: number[];
        wasCorrect: boolean;
        myPoints: number;
        didAnswer: boolean;
      };
      me: { rank: number; score: number };
      leaderboard: { nickname: string; rank: number }[];
    }>(await state(stateRequest({ pin: session.pin, playerId: anna })));

    expect(data.reveal.correctIndex).toBe(0);
    expect(data.reveal.correctOption).toBe("Trabant");
    expect(data.reveal.counts).toEqual([1, 1, 0, 0]);
    expect(data.reveal.wasCorrect).toBe(true);
    expect(data.reveal.myPoints).toBeGreaterThan(0);
    expect(data.me.rank).toBe(1);
    expect(data.me.score).toBe(playerRow(db, anna).score);
    expect(data.leaderboard[0].nickname).toBe("Anna");
  });

  it("pozná hráče, který nestihl odpovědět", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    const liny = seedPlayer(db, session.id, "Líný");
    await startGame(session.id);
    await revealQuestion(session.id);

    const data = await body<{
      reveal: { didAnswer: boolean; wasCorrect: boolean; myPoints: number };
    }>(await state(stateRequest({ pin: session.pin, playerId: liny })));

    expect(data.reveal.didAnswer).toBe(false);
    expect(data.reveal.wasCorrect).toBe(false);
    expect(data.reveal.myPoints).toBe(0);
  });

  it("vrátí me = null, když hráč v relaci už není (obnova po resetu)", async () => {
    const session = await lobby();

    const data = await body<{ me: unknown }>(
      await state(stateRequest({ pin: session.pin, playerId: UUID })),
    );

    expect(data.me).toBeNull();
  });

  it("odmítne neplatné parametry s konkrétní hláškou", async () => {
    const session = await lobby();

    const missing = await state(stateRequest({}));
    expect(missing.status).toBe(400);
    expect((await body<{ error: string }>(missing)).error).toBe(
      "Chybí PIN hry.",
    );

    const shortPin = await state(stateRequest({ pin: "12" }));
    expect(shortPin.status).toBe(400);
    expect((await body<{ error: string }>(shortPin)).error).toContain(
      "šest číslic",
    );

    expect((await state(stateRequest({ sessionId: "neco" }))).status).toBe(400);
    expect(
      (await state(stateRequest({ pin: session.pin, playerId: "neco" })))
        .status,
    ).toBe(400);
  });

  it("vrátí 404 pro neexistující relaci zadanou identifikátorem", async () => {
    const response = await state(stateRequest({ sessionId: UUID }));
    expect(response.status).toBe(404);
  });

  it("funguje i podle sessionId (obnova z localStorage)", async () => {
    const session = await lobby();
    const player = seedPlayer(db, session.id, "Verunka");

    const data = await body<{
      session: { id: string };
      me: { nickname: string };
    }>(await state(stateRequest({ sessionId: session.id, playerId: player })));

    expect(data.session.id).toBe(session.id);
    expect(data.me.nickname).toBe("Verunka");
  });

  it("nenastaví cache, aby se stav hry nikde neuložil", async () => {
    const session = await lobby();
    const response = await state(stateRequest({ pin: session.pin }));

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
