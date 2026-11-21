import { connection } from "next/server";

import { dbError, withApi } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GameStatus } from "@/lib/types";

import { requireAdmin } from "@/server/guard";

export type AdminSessionListItem = {
  id: string;
  pin: string;
  status: GameStatus;
  playerCount: number;
  createdAt: string;
  quizTitle: string;
};

/** Posledních 20 her – ať se moderátor po zavření okna umí vrátit do hry. */
export async function GET() {
  return withApi(async () => {
    await connection();
    await requireAdmin();

    const { data, error } = await supabaseAdmin()
      .from("game_sessions")
      .select("id, pin, status, player_count, created_at, quizzes(title)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw dbError(error);

    const rows = (data ?? []) as unknown as {
      id: string;
      pin: string;
      status: GameStatus;
      player_count: number;
      created_at: string;
      quizzes: { title: string } | null;
    }[];

    const sessions: AdminSessionListItem[] = rows.map((row) => ({
      id: row.id,
      pin: row.pin,
      status: row.status,
      playerCount: row.player_count,
      createdAt: row.created_at,
      quizTitle: row.quizzes?.title ?? "Kvíz",
    }));

    return { sessions };
  });
}
