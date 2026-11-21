import { ApiError, asRecord, dbError, readJson, withApi } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { requireAdmin } from "@/server/guard";
import { getQuestions } from "@/server/queries";
import { parseIdList, parseUuid } from "@/server/validate";

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAdmin();

    const body = asRecord(await readJson(request));
    const quizId = parseUuid(body.quizId, "Identifikátor kvízu");

    const orderedIds = parseIdList(body.orderedIds);
    const existing = await getQuestions(quizId);
    const known = new Set(existing.map((question) => question.id));

    if (
      orderedIds.length !== existing.length ||
      orderedIds.some((id) => !known.has(id))
    ) {
      throw new ApiError(
        "Nové pořadí neodpovídá otázkám v kvízu. Načti prosím stránku znovu.",
        409,
      );
    }

    const db = supabaseAdmin();

    for (const [index, id] of orderedIds.entries()) {
      const { error } = await db
        .from("questions")
        .update({ position: index + 1 })
        .eq("id", id)
        .eq("quiz_id", quizId);

      if (error) throw dbError(error);
    }

    return { ok: true };
  });
}
