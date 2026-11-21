import { connection, type NextRequest } from "next/server";

import { ApiError, withApi } from "@/lib/api";
import { isValidPin } from "@/lib/game";

import { getSessionByPin } from "@/server/queries";
import { buildPlayerState } from "@/server/state";
import { parseUuid } from "@/server/validate";

export async function GET(request: NextRequest) {
  return withApi(async () => {
    // stav hry je vždy per-požadavek, nikdy se neprerenderuje
    await connection();

    const params = request.nextUrl.searchParams;
    const rawSessionId = params.get("sessionId");
    const rawPlayerId = params.get("playerId");
    const pin = params.get("pin");

    // id hráče je nepovinné – před připojením ho ještě neznáme
    const playerId =
      rawPlayerId === null
        ? null
        : parseUuid(rawPlayerId, "Identifikátor hráče");

    if (rawSessionId !== null) {
      const sessionId = parseUuid(rawSessionId, "Identifikátor hry");
      return buildPlayerState(sessionId, playerId);
    }

    if (pin === null) {
      throw new ApiError("Chybí PIN hry.", 400);
    }

    if (!isValidPin(pin)) {
      throw new ApiError("PIN hry musí mít šest číslic.", 400);
    }

    const session = await getSessionByPin(pin);

    return buildPlayerState(session.id, playerId);
  });
}
