import { ApiError, dbError, withApi } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { requireAdmin } from "@/server/guard";
import { getPlayer, getSessionById } from "@/server/queries";
import { buildAdminState } from "@/server/state";
import { parseUuid } from "@/server/validate";

/**
 * Odebere hráče ze hry – třeba když se někdo připojí dvakrát nebo mu
 * umře telefon. Smazáním zmizí i jeho odpovědi (ON DELETE CASCADE)
 * a trigger sníží počítadlo hráčů.
 */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/sessions/[sessionId]/players/[playerId]">,
) {
  return withApi(async () => {
    await requireAdmin();

    const params = await ctx.params;
    const sessionId = parseUuid(params.sessionId, "Identifikátor hry");
    const playerId = parseUuid(params.playerId, "Identifikátor hráče");

    const session = await getSessionById(sessionId);

    if (session.status === "finished") {
      throw new ApiError("Hra už skončila, hráče už odebrat nelze.", 409);
    }

    const player = await getPlayer(session.id, playerId);

    if (!player) {
      throw new ApiError("Tenhle hráč v této hře není.", 404);
    }

    const { error } = await supabaseAdmin()
      .from("players")
      .delete()
      .eq("id", player.id)
      .eq("session_id", session.id);

    if (error) throw dbError(error);

    return buildAdminState(session.id);
  });
}
