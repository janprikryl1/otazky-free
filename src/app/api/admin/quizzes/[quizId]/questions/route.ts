import { asRecord, dbError, readJson, withApi } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { requireAdmin } from "@/server/guard";
import { getQuestions } from "@/server/queries";
import { parseQuestionPayload, parseUuid } from "@/server/validate";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/quizzes/[quizId]/questions">,
) {
  return withApi(async () => {
    await requireAdmin();

    const quizId = parseUuid((await ctx.params).quizId, "Identifikátor kvízu");
    const payload = parseQuestionPayload(asRecord(await readJson(request)));

    const existing = await getQuestions(quizId);
    const nextPosition =
      existing.reduce((max, question) => Math.max(max, question.position), 0) +
      1;

    const { data, error } = await supabaseAdmin()
      .from("questions")
      .insert({
        quiz_id: quizId,
        position: nextPosition,
        text: payload.text,
        time_limit: payload.timeLimit,
        options: payload.options,
        correct_index: payload.correctIndex,
      })
      .select("id")
      .single();

    if (error) throw dbError(error);

    return { questionId: data.id };
  });
}
