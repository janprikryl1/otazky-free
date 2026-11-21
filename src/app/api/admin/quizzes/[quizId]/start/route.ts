import { withApi } from "@/lib/api";

import { createSession } from "@/server/game-flow";
import { requireAdmin } from "@/server/guard";
import { parseUuid } from "@/server/validate";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/admin/quizzes/[quizId]/start">,
) {
  return withApi(async () => {
    await requireAdmin();

    const quizId = parseUuid((await ctx.params).quizId, "Identifikátor kvízu");
    const session = await createSession(quizId);

    return { sessionId: session.id, pin: session.pin };
  });
}
