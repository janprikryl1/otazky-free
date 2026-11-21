import { ApiError, asRecord, readJson, withApi } from "@/lib/api";

import {
  finishGame,
  nextQuestion,
  revealQuestion,
  startGame,
} from "@/server/game-flow";
import { requireAdmin } from "@/server/guard";
import { buildAdminState } from "@/server/state";
import { parseUuid } from "@/server/validate";

const ACTIONS = ["start", "reveal", "next", "finish"] as const;
type Action = (typeof ACTIONS)[number];

function parseAction(value: unknown): Action {
  if (
    typeof value === "string" &&
    (ACTIONS as readonly string[]).includes(value)
  ) {
    return value as Action;
  }
  throw new ApiError("Neznámá akce.", 400);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/sessions/[sessionId]/advance">,
) {
  return withApi(async () => {
    await requireAdmin();

    const sessionId = parseUuid(
      (await ctx.params).sessionId,
      "Identifikátor hry",
    );
    const action = parseAction(asRecord(await readJson(request)).action);

    switch (action) {
      case "start":
        await startGame(sessionId);
        break;
      case "reveal":
        await revealQuestion(sessionId);
        break;
      case "next":
        await nextQuestion(sessionId);
        break;
      case "finish":
        await finishGame(sessionId);
        break;
    }

    return buildAdminState(sessionId);
  });
}
