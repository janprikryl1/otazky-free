import { ApiError, asRecord, dbError, readJson, withApi } from "@/lib/api";
import { calculatePoints, LATE_ANSWER_GRACE_MS } from "@/lib/game";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { getPlayer, getQuestions, getSessionById } from "@/server/queries";
import { parseUuid } from "@/server/validate";

export async function POST(request: Request) {
  return withApi(async () => {
    const body = asRecord(await readJson(request));

    const sessionId = parseUuid(body.sessionId, "Identifikátor hry");
    const playerId = parseUuid(body.playerId, "Identifikátor hráče");
    const optionIndex = body.optionIndex;

    if (typeof optionIndex !== "number" || !Number.isInteger(optionIndex)) {
      throw new ApiError("Neplatná odpověď.", 400);
    }

    const session = await getSessionById(sessionId);

    if (session.status !== "question") {
      throw new ApiError("Hlasování je už uzavřené.", 409);
    }

    const player = await getPlayer(session.id, playerId);
    if (!player) {
      throw new ApiError("Hráč v této hře neexistuje.", 403);
    }

    const questions = await getQuestions(session.quiz_id);
    const question = questions[session.current_question_index];

    if (!question) {
      throw new ApiError("Aktuální otázka nebyla nalezena.", 500);
    }

    if (optionIndex < 0 || optionIndex >= question.options.length) {
      throw new ApiError("Taková možnost u této otázky není.", 400);
    }

    const endsAt = session.question_ends_at
      ? new Date(session.question_ends_at).getTime()
      : null;
    const startedAt = session.question_started_at
      ? new Date(session.question_started_at).getTime()
      : null;

    const now = Date.now();

    if (endsAt !== null && now > endsAt + LATE_ANSWER_GRACE_MS) {
      throw new ApiError("Čas na odpověď vypršel.", 409);
    }

    const isCorrect = question.correct_index === optionIndex;
    const points = isCorrect
      ? calculatePoints({
          timeLimitSeconds: question.time_limit,
          elapsedMs: startedAt !== null ? now - startedAt : 0,
        })
      : 0;

    const { error } = await supabaseAdmin().from("answers").insert({
      session_id: session.id,
      question_id: question.id,
      player_id: player.id,
      option_index: optionIndex,
      is_correct: isCorrect,
      points,
    });

    if (error) {
      if (error.code === "23505") {
        throw new ApiError("Na tuto otázku už jsi odpověděl.", 409);
      }
      throw dbError(error);
    }

    // Vědomě nevracíme, jestli byla odpověď správná – to se hráč dozví
    // teprve ve fázi vyhodnocení, společně s ostatními.
    return { accepted: true, optionIndex };
  });
}
