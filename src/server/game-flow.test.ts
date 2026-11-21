import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { FakeSupabase, resetTestUuids } from "@/test/fake-supabase";
import { playerRow, seedPlayer, seedQuiz, sessionRow } from "@/test/fixtures";

let db: FakeSupabase;

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => db,
}));

const {
  autoRevealIfExpired,
  createSession,
  finishGame,
  nextQuestion,
  revealQuestion,
  startGame,
} = await import("@/server/game-flow");
const { buildAdminState, buildPlayerState } = await import("@/server/state");
const { getSessionById } = await import("@/server/queries");

beforeEach(() => {
  db = new FakeSupabase();
  resetTestUuids();
  vi.useRealTimers();
});

describe("createSession", () => {
  it("vytvoří hru s šestimístným PINem v čekárně", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);

    expect(session.pin).toMatch(/^[0-9]{6}$/);
    expect(session.status).toBe("lobby");
    expect(session.current_question_index).toBe(-1);
    expect(session.player_count).toBe(0);
  });

  it("odmítne kvíz, kde chybí správná odpověď, a vypíše které otázky", async () => {
    const quizId = seedQuiz(db, [
      { text: "A?", options: ["1", "2"], correctIndex: 0 },
      { text: "B?", options: ["1", "2"], correctIndex: null },
      { text: "C?", options: ["1", "2"], correctIndex: null },
    ]);

    const error = await createSession(quizId).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toContain("#2, #3");
    expect(db.tables.game_sessions).toHaveLength(0);
  });

  it("odmítne kvíz bez otázek", async () => {
    const quizId = seedQuiz(db, []);
    await expect(createSession(quizId)).rejects.toThrow(
      "Kvíz neobsahuje žádné otázky",
    );
  });

  it("zopakuje generování, když se PIN srazí s existující hrou", async () => {
    const quizId = seedQuiz(db);
    const first = await createSession(quizId);

    // další tři pokusy vrátí stejný PIN, čtvrtý až jiný
    const sequence = [first.pin, first.pin, first.pin, "999111"];
    let call = 0;
    vi.spyOn(Math, "random").mockImplementation(() => {
      const pin = sequence[Math.min(call++, sequence.length - 1)];
      return (Number(pin) - 100000) / 900000;
    });

    const second = await createSession(quizId);

    expect(second.pin).toBe("999111");
    expect(second.id).not.toBe(first.id);
  });
});

describe("průběh hry", () => {
  it("projde celou hru od čekárny po vyhlášení", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    seedPlayer(db, session.id, "Verunka");

    const started = await startGame(session.id);
    expect(started.status).toBe("question");
    expect(started.current_question_index).toBe(0);
    expect(started.question_started_at).not.toBeNull();
    expect(started.question_ends_at).not.toBeNull();

    await revealQuestion(session.id);
    expect(sessionRow(db, session.id).status).toBe("reveal");

    await nextQuestion(session.id);
    expect(sessionRow(db, session.id).current_question_index).toBe(1);
    expect(sessionRow(db, session.id).status).toBe("question");

    await nextQuestion(session.id);
    await nextQuestion(session.id);

    const final = sessionRow(db, session.id);
    expect(final.status).toBe("finished");
    expect(final.question_ends_at).toBeNull();
  });

  it("nastaví konec otázky podle jejího vlastního limitu", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    seedPlayer(db, session.id, "Verunka");

    const started = await startGame(session.id);
    const firstWindow =
      new Date(started.question_ends_at as string).getTime() -
      new Date(started.question_started_at as string).getTime();
    expect(Math.round(firstWindow / 1000)).toBe(20);

    await nextQuestion(session.id);
    const second = sessionRow(db, session.id);
    const secondWindow =
      new Date(second.question_ends_at as string).getTime() -
      new Date(second.question_started_at as string).getTime();
    expect(Math.round(secondWindow / 1000)).toBe(30);
  });

  it("vynuluje počítadlo odpovědí při každé nové otázce", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    const player = seedPlayer(db, session.id, "Verunka");

    await startGame(session.id);

    db.tables.answers.push({
      id: "a1",
      session_id: session.id,
      question_id: db.tables.questions[0].id,
      player_id: player,
      option_index: 0,
      is_correct: true,
      points: 900,
      answered_at: new Date().toISOString(),
    });
    sessionRow(db, session.id).answers_received = 1;

    await nextQuestion(session.id);
    expect(sessionRow(db, session.id).answers_received).toBe(0);
  });

  it("nedovolí spustit už běžící hru", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    seedPlayer(db, session.id, "Verunka");

    await startGame(session.id);
    await expect(startGame(session.id)).rejects.toThrow("už byl spuštěn");
  });

  it("odmítne uzavřít otázku, když žádná neběží", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);

    await expect(revealQuestion(session.id)).rejects.toThrow(
      "Teď neběží žádná otázka",
    );
  });

  it("hlásí poslední otázku, aby se dalo přepnout tlačítko", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    seedPlayer(db, session.id, "Verunka");

    await startGame(session.id);
    expect((await buildAdminState(session.id)).isLastQuestion).toBe(false);

    await nextQuestion(session.id);
    await nextQuestion(session.id);
    expect((await buildAdminState(session.id)).isLastQuestion).toBe(true);
  });

  it("ukončí hru předčasně a vyhodnotí rozdělanou otázku", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    const player = seedPlayer(db, session.id, "Verunka");

    await startGame(session.id);
    db.tables.answers.push({
      id: "a1",
      session_id: session.id,
      question_id: db.tables.questions[0].id,
      player_id: player,
      option_index: 0,
      is_correct: true,
      points: 800,
      answered_at: new Date().toISOString(),
    });

    await finishGame(session.id);

    expect(sessionRow(db, session.id).status).toBe("finished");
    // body za rozdělanou otázku se stihly připsat
    expect(playerRow(db, player).score).toBe(800);
  });

  it("vrátí nenalezenou hru jako 404, ne jako pád serveru", async () => {
    const error = await getSessionById(
      "11111111-1111-4111-8111-111111111111",
    ).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
  });
});

describe("připisování bodů", () => {
  it("připíše body až při vyhodnocení, ne hned po odpovědi", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    const anna = seedPlayer(db, session.id, "Anna");
    const bob = seedPlayer(db, session.id, "Bob");

    await startGame(session.id);
    const questionId = db.tables.questions[0].id as string;

    db.tables.answers.push(
      {
        id: "a1",
        session_id: session.id,
        question_id: questionId,
        player_id: anna,
        option_index: 0,
        is_correct: true,
        points: 950,
        answered_at: new Date().toISOString(),
      },
      {
        id: "a2",
        session_id: session.id,
        question_id: questionId,
        player_id: bob,
        option_index: 1,
        is_correct: false,
        points: 0,
        answered_at: new Date().toISOString(),
      },
    );

    // během otázky je skóre pořád nula
    expect(playerRow(db, anna).score).toBe(0);

    await revealQuestion(session.id);

    expect(playerRow(db, anna).score).toBe(950);
    expect(playerRow(db, bob).score).toBe(0);
  });

  it("nepřipíše body dvakrát, i když se vyhodnocení spustí opakovaně", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    const anna = seedPlayer(db, session.id, "Anna");

    await startGame(session.id);
    db.tables.answers.push({
      id: "a1",
      session_id: session.id,
      question_id: db.tables.questions[0].id,
      player_id: anna,
      option_index: 0,
      is_correct: true,
      points: 700,
      answered_at: new Date().toISOString(),
    });

    await revealQuestion(session.id);
    await revealQuestion(session.id);
    await revealQuestion(session.id);

    expect(playerRow(db, anna).score).toBe(700);
  });

  it("nepřipíše body dvakrát ani při souběžném kliknutí moderátora", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    const anna = seedPlayer(db, session.id, "Anna");

    await startGame(session.id);
    db.tables.answers.push({
      id: "a1",
      session_id: session.id,
      question_id: db.tables.questions[0].id,
      player_id: anna,
      option_index: 0,
      is_correct: true,
      points: 600,
      answered_at: new Date().toISOString(),
    });

    await Promise.all([
      revealQuestion(session.id),
      revealQuestion(session.id),
      revealQuestion(session.id),
    ]);

    expect(playerRow(db, anna).score).toBe(600);
  });

  it("sečte body napříč otázkami", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    const anna = seedPlayer(db, session.id, "Anna");

    await startGame(session.id);
    db.tables.answers.push({
      id: "a1",
      session_id: session.id,
      question_id: db.tables.questions[0].id,
      player_id: anna,
      option_index: 0,
      is_correct: true,
      points: 500,
      answered_at: new Date().toISOString(),
    });

    await nextQuestion(session.id);
    db.tables.answers.push({
      id: "a2",
      session_id: session.id,
      question_id: db.tables.questions[1].id,
      player_id: anna,
      option_index: 0,
      is_correct: true,
      points: 300,
      answered_at: new Date().toISOString(),
    });

    await nextQuestion(session.id);

    expect(playerRow(db, anna).score).toBe(800);
  });
});

describe("automatické uzavření po vypršení času", () => {
  it("uzavře otázku, když moderátorovi spadne obrazovka", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    seedPlayer(db, session.id, "Anna");

    await startGame(session.id);

    // posuneme konec otázky do minulosti
    sessionRow(db, session.id).question_ends_at = new Date(
      Date.now() - 5000,
    ).toISOString();

    const after = await autoRevealIfExpired(await getSessionById(session.id));
    expect(after.status).toBe("reveal");
  });

  it("neuzavře otázku, dokud čas běží", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    seedPlayer(db, session.id, "Anna");

    await startGame(session.id);

    const after = await autoRevealIfExpired(await getSessionById(session.id));
    expect(after.status).toBe("question");
  });

  it("promítne se i do stavu, který si načte hráč", async () => {
    const quizId = seedQuiz(db);
    const session = await createSession(quizId);
    const anna = seedPlayer(db, session.id, "Anna");

    await startGame(session.id);
    sessionRow(db, session.id).question_ends_at = new Date(
      Date.now() - 5000,
    ).toISOString();

    const state = await buildPlayerState(session.id, anna);
    expect(state.session.status).toBe("reveal");
    expect(state.reveal).not.toBeNull();
  });
});
