import { asRecord, dbError, readJson, withApi } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { requireAdmin } from "@/server/guard";
import { parseQuestionPayload, parseUuid } from "@/server/validate";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/questions/[questionId]">,
) {
  return withApi(async () => {
    await requireAdmin();

    const questionId = parseUuid(
      (await ctx.params).questionId,
      "Identifikátor otázky",
    );
    const payload = parseQuestionPayload(asRecord(await readJson(request)));

    const { error } = await supabaseAdmin()
      .from("questions")
      .update({
        text: payload.text,
        time_limit: payload.timeLimit,
        options: payload.options,
        correct_index: payload.correctIndex,
      })
      .eq("id", questionId);

    if (error) throw dbError(error);

    return { ok: true };
  });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/questions/[questionId]">,
) {
  return withApi(async () => {
    await requireAdmin();

    const questionId = parseUuid(
      (await ctx.params).questionId,
      "Identifikátor otázky",
    );

    const { error } = await supabaseAdmin()
      .from("questions")
      .delete()
      .eq("id", questionId);

    if (error) throw dbError(error);

    return { ok: true };
  });
}
