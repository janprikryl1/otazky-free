import { ApiError, dbError } from "@/lib/api";
import { generatePin } from "@/lib/game";
import { supabaseAdmin as db } from "@/lib/supabase/admin";
import type { GameSessionRow, QuestionRow } from "@/lib/types";

import { getQuestions, getSessionById } from "@/server/queries";

/** Jak dlouho po vypršení limitu smí server otázku uzavřít sám. */
const AUTO_REVEAL_DELAY_MS = 1500;

function questionWindow(question: QuestionRow) {
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + question.time_limit * 1000);

  return {
    question_started_at: startedAt.toISOString(),
    question_ends_at: endsAt.toISOString(),
  };
}

/** Všechny otázky kvízu musí mít označenou správnou odpověď. */
function assertPlayable(questions: QuestionRow[]) {
  if (questions.length === 0) {
    throw new ApiError("Kvíz neobsahuje žádné otázky.", 400);
  }

  const unfinished = questions.filter((q) => q.correct_index === null);

  if (unfinished.length > 0) {
    const list = unfinished.map((q) => `#${q.position}`).join(", ");
    throw new ApiError(
      `U těchto otázek není označená správná odpověď: ${list}. Doplň ji v editoru kvízu.`,
      400,
    );
  }
}

/** Vytvoří novou herní relaci s unikátním PINem. */
export async function createSession(quizId: string): Promise<GameSessionRow> {
  const questions = await getQuestions(quizId);
  assertPlayable(questions);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await db()
      .from("game_sessions")
      .insert({ quiz_id: quizId, pin: generatePin() })
      .select("*")
      .single();

    if (!error && data) return data as GameSessionRow;

    // 23505 = unique_violation → PIN už existuje, zkusíme jiný
    if (error && error.code !== "23505") {
      throw dbError(error);
    }
  }

  throw new ApiError(
    "Nepodařilo se vygenerovat volný PIN. Zkus to prosím znovu.",
    500,
  );
}

/** Lobby → první otázka. */
export async function startGame(sessionId: string): Promise<GameSessionRow> {
  const session = await getSessionById(sessionId);

  if (session.status !== "lobby") {
    throw new ApiError("Kvíz už byl spuštěn.", 409);
  }

  const questions = await getQuestions(session.quiz_id);
  assertPlayable(questions);

  const { data, error } = await db()
    .from("game_sessions")
    .update({
      status: "question",
      current_question_index: 0,
      answers_received: 0,
      ...questionWindow(questions[0]),
    })
    .eq("id", sessionId)
    .eq("status", "lobby")
    .select("*")
    .maybeSingle();

  if (error) throw dbError(error);
  if (!data) throw new ApiError("Kvíz už byl spuštěn.", 409);

  return data as GameSessionRow;
}

/**
 * Otázka → vyhodnocení. Body se připisují právě tady, aby hráči během
 * běžící otázky nemohli z vlastního skóre vyčíst, jak odpověděli.
 * Díky podmínce na status je operace idempotentní.
 */
export async function revealQuestion(
  sessionId: string,
): Promise<GameSessionRow> {
  const session = await getSessionById(sessionId);

  if (session.status === "reveal") return session;
  if (session.status !== "question") {
    throw new ApiError("Teď neběží žádná otázka.", 409);
  }

  const questions = await getQuestions(session.quiz_id);
  const question = questions[session.current_question_index];

  if (!question) throw new ApiError("Aktuální otázka nebyla nalezena.", 500);

  const { data, error } = await db()
    .from("game_sessions")
    .update({ status: "reveal" })
    .eq("id", sessionId)
    .eq("status", "question")
    .select("*")
    .maybeSingle();

  if (error) throw dbError(error);

  // Jiný požadavek nás předběhl – body už připsal on.
  if (!data) return getSessionById(sessionId);

  const { error: scoreError } = await db().rpc("apply_question_scores", {
    p_session_id: sessionId,
    p_question_id: question.id,
  });

  if (scoreError) throw dbError(scoreError);

  return data as GameSessionRow;
}

/** Vyhodnocení → další otázka, nebo konec hry. */
export async function nextQuestion(sessionId: string): Promise<GameSessionRow> {
  const session = await getSessionById(sessionId);

  if (session.status === "finished") return session;

  if (session.status === "question") {
    // nejdřív uzavřeme a vyhodnotíme běžící otázku
    await revealQuestion(sessionId);
  }

  const questions = await getQuestions(session.quiz_id);
  const nextIndex = session.current_question_index + 1;
  const next = questions[nextIndex];

  const patch = next
    ? {
        status: "question" as const,
        current_question_index: nextIndex,
        answers_received: 0,
        ...questionWindow(next),
      }
    : {
        status: "finished" as const,
        question_started_at: null,
        question_ends_at: null,
      };

  const { data, error } = await db()
    .from("game_sessions")
    .update(patch)
    .eq("id", sessionId)
    .eq("current_question_index", session.current_question_index)
    .select("*")
    .maybeSingle();

  if (error) throw dbError(error);
  if (!data) return getSessionById(sessionId);

  return data as GameSessionRow;
}

/** Předčasné ukončení celé hry. */
export async function finishGame(sessionId: string): Promise<GameSessionRow> {
  const session = await getSessionById(sessionId);

  if (session.status === "question") {
    await revealQuestion(sessionId);
  }

  const { data, error } = await db()
    .from("game_sessions")
    .update({
      status: "finished",
      question_started_at: null,
      question_ends_at: null,
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error) throw dbError(error);

  return data as GameSessionRow;
}

/**
 * Pojistka: když moderátorovi spadne obrazovka, uzavře se otázka sama
 * krátce po vypršení limitu – hráči se tak vždy dostanou k vyhodnocení.
 */
export async function autoRevealIfExpired(
  session: GameSessionRow,
): Promise<GameSessionRow> {
  if (session.status !== "question" || !session.question_ends_at) {
    return session;
  }

  const endsAt = new Date(session.question_ends_at).getTime();
  if (Number.isNaN(endsAt)) return session;
  if (Date.now() < endsAt + AUTO_REVEAL_DELAY_MS) return session;

  try {
    return await revealQuestion(session.id);
  } catch {
    return session;
  }
}
