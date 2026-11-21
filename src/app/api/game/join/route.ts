import { ApiError, asRecord, dbError, readJson, withApi } from "@/lib/api";
import { isValidPin, normalizeNickname } from "@/lib/game";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { getSessionByPin } from "@/server/queries";

export async function POST(request: Request) {
  return withApi(async () => {
    const body = asRecord(await readJson(request));

    const pin = body.pin;
    if (!isValidPin(pin)) {
      throw new ApiError("PIN hry musí mít šest číslic.", 400);
    }

    const nickname = normalizeNickname(body.nickname);
    if (!nickname) {
      throw new ApiError("Zadej prosím přezdívku (1 až 24 znaků).", 400);
    }

    const session = await getSessionByPin(pin);

    if (session.status === "finished") {
      throw new ApiError("Tato hra už skončila.", 409);
    }

    const { data, error } = await supabaseAdmin()
      .from("players")
      .insert({ session_id: session.id, nickname })
      .select("id, nickname, score")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ApiError(
          "Tuhle přezdívku už někdo používá. Vyber si prosím jinou.",
          409,
        );
      }
      throw dbError(error);
    }

    return {
      playerId: data.id,
      nickname: data.nickname,
      sessionId: session.id,
      pin: session.pin,
      status: session.status,
    };
  });
}
