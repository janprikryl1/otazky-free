import { connection } from "next/server";

import { asRecord, dbError, readJson, withApi } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AdminQuizDetail } from "@/lib/types";

import { requireAdmin } from "@/server/guard";
import { getQuestions, getQuiz } from "@/server/queries";
import { parseQuizPayload, parseUuid } from "@/server/validate";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/admin/quizzes/[quizId]">,
) {
  return withApi(async () => {
    await connection();
    await requireAdmin();

    const quizId = parseUuid((await ctx.params).quizId, "Identifikátor kvízu");
    const [quiz, questions] = await Promise.all([
      getQuiz(quizId),
      getQuestions(quizId),
    ]);

    const detail: AdminQuizDetail = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questions: questions.map((question) => ({
        id: question.id,
        position: question.position,
        text: question.text,
        timeLimit: question.time_limit,
        options: question.options,
        correctIndex: question.correct_index,
      })),
    };

    return detail;
  });
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/quizzes/[quizId]">,
) {
  return withApi(async () => {
    await requireAdmin();

    const quizId = parseUuid((await ctx.params).quizId, "Identifikátor kvízu");
    const payload = parseQuizPayload(asRecord(await readJson(request)));

    const { error } = await supabaseAdmin()
      .from("quizzes")
      .update(payload)
      .eq("id", quizId);

    if (error) throw dbError(error);

    return { ok: true };
  });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/quizzes/[quizId]">,
) {
  return withApi(async () => {
    await requireAdmin();

    const quizId = parseUuid((await ctx.params).quizId, "Identifikátor kvízu");

    const { error } = await supabaseAdmin()
      .from("quizzes")
      .delete()
      .eq("id", quizId);

    if (error) throw dbError(error);

    return { ok: true };
  });
}
