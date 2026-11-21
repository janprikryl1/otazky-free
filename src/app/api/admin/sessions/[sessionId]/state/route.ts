import { connection } from "next/server";

import { withApi } from "@/lib/api";

import { requireAdmin } from "@/server/guard";
import { buildAdminState } from "@/server/state";
import { parseUuid } from "@/server/validate";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/admin/sessions/[sessionId]/state">,
) {
  return withApi(async () => {
    await connection();
    await requireAdmin();

    const sessionId = parseUuid(
      (await ctx.params).sessionId,
      "Identifikátor hry",
    );

    return buildAdminState(sessionId);
  });
}
