import { beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_COOKIE } from "@/lib/admin-auth";
import { cookieJar } from "@/test/cookie-jar";
import { FakeSupabase, resetTestUuids } from "@/test/fake-supabase";
import { seedPlayer, seedQuiz } from "@/test/fixtures";

let db: FakeSupabase;

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => db,
}));

const { POST: login } = await import("@/app/api/admin/login/route");
const { POST: logout } = await import("@/app/api/admin/logout/route");
const { GET: listQuizzes, POST: createQuiz } = await import(
  "@/app/api/admin/quizzes/route"
);
const {
  GET: quizDetail,
  PATCH: updateQuiz,
  DELETE: deleteQuiz,
} = await import("@/app/api/admin/quizzes/[quizId]/route");
const { POST: addQuestion } = await import(
  "@/app/api/admin/quizzes/[quizId]/questions/route"
);
const { PATCH: updateQuestion, DELETE: deleteQuestion } = await import(
  "@/app/api/admin/questions/[questionId]/route"
);
const { POST: reorder } = await import(
  "@/app/api/admin/questions/reorder/route"
);
const { POST: startSession } = await import(
  "@/app/api/admin/quizzes/[quizId]/start/route"
);
const { GET: listSessions } = await import("@/app/api/admin/sessions/route");
const { POST: advance } = await import(
  "@/app/api/admin/sessions/[sessionId]/advance/route"
);
const { GET: adminState } = await import(
  "@/app/api/admin/sessions/[sessionId]/state/route"
);

const PASSWORD = process.env.ADMIN_PASSWORD as string;
const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

function post(body?: unknown): Request {
  return new Request("http://test.local/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function ctx<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) } as never;
}

async function body<T = Record<string, unknown>>(
  response: Response,
): Promise<T> {
  return (await response.json()) as T;
}

async function signIn() {
  const response = await login(post({ password: PASSWORD }));
  expect(response.status).toBe(200);
}

beforeEach(() => {
  db = new FakeSupabase();
  resetTestUuids();
  cookieJar.clear();
});

describe("přihlášení moderátora", () => {
  it("nastaví cookie při správném heslu", async () => {
    await signIn();
    expect(cookieJar.has(ADMIN_COOKIE)).toBe(true);
  });

  it("v cookie neuloží heslo v čitelné podobě", async () => {
    await signIn();
    const token = cookieJar.get(ADMIN_COOKIE) as string;

    expect(token).not.toContain(PASSWORD);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("odmítne špatné, prázdné i nesprávně typované heslo", async () => {
    for (const password of ["spatne", "", null, 42, { password: PASSWORD }]) {
      const response = await login(post({ password }));
      expect(response.status).toBe(401);
      expect(cookieJar.has(ADMIN_COOKIE)).toBe(false);
    }
  });

  it("odmítne heslo, které je jen prefixem toho správného", async () => {
    const response = await login(post({ password: PASSWORD.slice(0, -1) }));
    expect(response.status).toBe(401);
  });

  it("odhlášení cookie smaže", async () => {
    await signIn();
    await logout();
    expect(cookieJar.has(ADMIN_COOKIE)).toBe(false);
  });
});

describe("ochrana admin endpointů", () => {
  it("bez přihlášení vrátí 401 a nic nezmění", async () => {
    const quizId = seedQuiz(db);
    const questionId = db.tables.questions[0].id as string;

    const responses = await Promise.all([
      listQuizzes(),
      createQuiz(post({ title: "Pokus" })),
      quizDetail(new Request("http://test.local"), ctx({ quizId })),
      updateQuiz(post({ title: "Jiný" }), ctx({ quizId })),
      deleteQuiz(new Request("http://test.local"), ctx({ quizId })),
      addQuestion(post({ text: "A?", options: ["1", "2"] }), ctx({ quizId })),
      updateQuestion(
        post({ text: "B?", options: ["1", "2"] }),
        ctx({ questionId }),
      ),
      deleteQuestion(new Request("http://test.local"), ctx({ questionId })),
      reorder(post({ quizId, orderedIds: [questionId] })),
      startSession(new Request("http://test.local"), ctx({ quizId })),
      listSessions(),
      adminState(new Request("http://test.local"), ctx({ sessionId: UUID })),
      advance(post({ action: "start" }), ctx({ sessionId: UUID })),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
    }

    // žádná z odmítnutých operací se nesměla promítnout do dat
    expect(db.tables.quizzes).toHaveLength(1);
    expect(db.tables.questions).toHaveLength(3);
    expect(db.tables.game_sessions).toHaveLength(0);
  });

  it("padělanou cookie neuzná", async () => {
    cookieJar.set(ADMIN_COOKIE, "a".repeat(64));
    expect((await listQuizzes()).status).toBe(401);

    cookieJar.set(ADMIN_COOKIE, "");
    expect((await listQuizzes()).status).toBe(401);
  });
});

describe("správa kvízů", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("vypíše kvízy i počet otázek bez správné odpovědi", async () => {
    seedQuiz(db, [
      { text: "A?", options: ["1", "2"], correctIndex: 0 },
      { text: "B?", options: ["1", "2"], correctIndex: null },
    ]);

    const data = await body<{
      quizzes: { questionCount: number; unfinishedCount: number }[];
    }>(await listQuizzes());

    expect(data.quizzes).toHaveLength(1);
    expect(data.quizzes[0].questionCount).toBe(2);
    expect(data.quizzes[0].unfinishedCount).toBe(1);
  });

  it("vytvoří kvíz a vrátí jeho id", async () => {
    const data = await body<{ quizId: string }>(
      await createQuiz(post({ title: "  Nový   kvíz ", description: "Popis" })),
    );

    expect(data.quizId).toBeTruthy();
    expect(db.tables.quizzes[0].title).toBe("Nový kvíz");
  });

  it("odmítne kvíz bez názvu", async () => {
    expect((await createQuiz(post({ title: "   " }))).status).toBe(400);
    expect((await createQuiz(post({}))).status).toBe(400);
    expect(db.tables.quizzes).toHaveLength(0);
  });

  it("vrátí detail kvízu s otázkami v pořadí", async () => {
    const quizId = seedQuiz(db);

    const data = await body<{
      questions: { position: number; text: string }[];
    }>(await quizDetail(new Request("http://test.local"), ctx({ quizId })));

    expect(data.questions.map((q) => q.position)).toEqual([1, 2, 3]);
  });

  it("smaže kvíz i s otázkami", async () => {
    const quizId = seedQuiz(db);

    await deleteQuiz(new Request("http://test.local"), ctx({ quizId }));

    expect(db.tables.quizzes).toHaveLength(0);
    expect(db.tables.questions).toHaveLength(0);
  });

  it("odmítne neplatný identifikátor kvízu", async () => {
    const response = await quizDetail(
      new Request("http://test.local"),
      ctx({ quizId: "../../tajne" }),
    );

    expect(response.status).toBe(400);
    expect((await body<{ error: string }>(response)).error).toContain(
      "neplatný formát",
    );
  });

  it("vrátí 404 pro kvíz, který neexistuje", async () => {
    const response = await quizDetail(
      new Request("http://test.local"),
      ctx({ quizId: UUID }),
    );

    expect(response.status).toBe(404);
  });
});

describe("správa otázek", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("přidá otázku na konec kvízu", async () => {
    const quizId = seedQuiz(db);

    await addQuestion(
      post({
        text: "Nová otázka?",
        timeLimit: 30,
        options: ["Ano", "Ne"],
        correctIndex: 1,
      }),
      ctx({ quizId }),
    );

    const added = db.tables.questions.at(-1) as Record<string, unknown>;
    expect(added.position).toBe(4);
    expect(added.time_limit).toBe(30);
    expect(added.correct_index).toBe(1);
  });

  it("uloží jen vyplněné možnosti a přepočítá správnou odpověď", async () => {
    const quizId = seedQuiz(db);

    await addQuestion(
      post({
        text: "Tři možnosti?",
        options: ["Ano", "Ne", "", "Možná"],
        correctIndex: 3,
      }),
      ctx({ quizId }),
    );

    const added = db.tables.questions.at(-1) as Record<string, unknown>;
    expect(added.options).toEqual(["Ano", "Ne", "Možná"]);
    expect(added.correct_index).toBe(2);
  });

  it("odmítne otázku s méně než dvěma možnostmi", async () => {
    const quizId = seedQuiz(db);
    const before = db.tables.questions.length;

    const response = await addQuestion(
      post({ text: "Jen jedna?", options: ["Ano", "  "] }),
      ctx({ quizId }),
    );

    expect(response.status).toBe(400);
    expect(db.tables.questions).toHaveLength(before);
  });

  it("upraví i smaže otázku", async () => {
    seedQuiz(db);
    const questionId = db.tables.questions[0].id as string;

    await updateQuestion(
      post({ text: "Upravená?", options: ["A", "B"], correctIndex: 0 }),
      ctx({ questionId }),
    );
    expect(db.tables.questions[0].text).toBe("Upravená?");

    await deleteQuestion(new Request("http://test.local"), ctx({ questionId }));
    expect(db.tables.questions).toHaveLength(2);
  });

  it("přerovná otázky podle zaslaného pořadí", async () => {
    const quizId = seedQuiz(db);
    const ids = db.tables.questions.map((q) => q.id as string);
    const reversed = [...ids].reverse();

    const response = await reorder(post({ quizId, orderedIds: reversed }));
    expect(response.status).toBe(200);

    for (const [index, id] of reversed.entries()) {
      const question = db.tables.questions.find((q) => q.id === id);
      expect(question?.position).toBe(index + 1);
    }
  });

  it("odmítne neúplný seznam při přerovnání", async () => {
    const quizId = seedQuiz(db);
    const ids = db.tables.questions.map((q) => q.id as string);

    const response = await reorder(post({ quizId, orderedIds: [ids[0]] }));

    expect(response.status).toBe(409);
    expect((await body<{ error: string }>(response)).error).toContain(
      "Načti prosím stránku znovu",
    );
  });

  it("odmítne přerovnání s cizí otázkou", async () => {
    const quizId = seedQuiz(db);
    const otherQuizId = seedQuiz(db);
    const mine = db.tables.questions
      .filter((q) => q.quiz_id === quizId)
      .map((q) => q.id as string);
    const foreign = db.tables.questions.find((q) => q.quiz_id === otherQuizId)
      ?.id as string;

    const response = await reorder(
      post({ quizId, orderedIds: [mine[0], mine[1], foreign] }),
    );

    expect(response.status).toBe(409);
  });
});

describe("řízení živé hry", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("spustí hru a vrátí PIN", async () => {
    const quizId = seedQuiz(db);

    const data = await body<{ sessionId: string; pin: string }>(
      await startSession(new Request("http://test.local"), ctx({ quizId })),
    );

    expect(data.pin).toMatch(/^[0-9]{6}$/);
    expect(db.tables.game_sessions).toHaveLength(1);
  });

  it("nespustí kvíz, kde chybí správná odpověď", async () => {
    const quizId = seedQuiz(db, [
      { text: "A?", options: ["1", "2"], correctIndex: null },
    ]);

    const response = await startSession(
      new Request("http://test.local"),
      ctx({ quizId }),
    );

    expect(response.status).toBe(400);
    expect((await body<{ error: string }>(response)).error).toContain("#1");
  });

  it("panel moderátora vidí správnou odpověď už během otázky", async () => {
    const quizId = seedQuiz(db);
    const { sessionId } = await body<{ sessionId: string }>(
      await startSession(new Request("http://test.local"), ctx({ quizId })),
    );
    seedPlayer(db, sessionId, "Anna");

    await advance(post({ action: "start" }), ctx({ sessionId }));

    const data = await body<{
      question: { correctIndex: number };
      session: { status: string };
    }>(await adminState(new Request("http://test.local"), ctx({ sessionId })));

    expect(data.session.status).toBe("question");
    expect(data.question.correctIndex).toBe(0);
  });

  it("posouvá hru akcemi start → reveal → next", async () => {
    const quizId = seedQuiz(db);
    const { sessionId } = await body<{ sessionId: string }>(
      await startSession(new Request("http://test.local"), ctx({ quizId })),
    );
    seedPlayer(db, sessionId, "Anna");

    const started = await body<{ session: { status: string } }>(
      await advance(post({ action: "start" }), ctx({ sessionId })),
    );
    expect(started.session.status).toBe("question");

    const revealed = await body<{ session: { status: string } }>(
      await advance(post({ action: "reveal" }), ctx({ sessionId })),
    );
    expect(revealed.session.status).toBe("reveal");

    const next = await body<{ session: { currentQuestionIndex: number } }>(
      await advance(post({ action: "next" }), ctx({ sessionId })),
    );
    expect(next.session.currentQuestionIndex).toBe(1);

    const finished = await body<{ session: { status: string } }>(
      await advance(post({ action: "finish" }), ctx({ sessionId })),
    );
    expect(finished.session.status).toBe("finished");
  });

  it("odmítne neznámou akci", async () => {
    const quizId = seedQuiz(db);
    const { sessionId } = await body<{ sessionId: string }>(
      await startSession(new Request("http://test.local"), ctx({ quizId })),
    );

    for (const action of ["smazat", "", null, 1, ["start"]]) {
      const response = await advance(post({ action }), ctx({ sessionId }));
      expect(response.status).toBe(400);
    }
  });

  it("vypíše rozehrané hry i s názvem kvízu", async () => {
    const quizId = seedQuiz(db);
    await startSession(new Request("http://test.local"), ctx({ quizId }));

    const data = await body<{
      sessions: { pin: string; status: string; quizTitle: string }[];
    }>(await listSessions());

    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].status).toBe("lobby");
    expect(data.sessions[0].quizTitle).toBe("Velký kvíz o Josefovi");
  });
});
