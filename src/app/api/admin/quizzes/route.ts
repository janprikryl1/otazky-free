import { connection } from "next/server";

import { asRecord, dbError, readJson, withApi } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AdminQuizListItem } from "@/lib/types";

import { requireAdmin } from "@/server/guard";
import { parseQuizPayload } from "@/server/validate";

export async function GET() {
  return withApi(async () => {
    await connection();
    await requireAdmin();

    const { data, error } = await supabaseAdmin()
      .from("quizzes")
      .select(
        "id, title, description, created_at, questions(id, correct_index)",
      )
      .order("created_at", { ascending: false });

    if (error) throw dbError(error);

    const rows = (data ?? []) as unknown as {
      id: string;
      title: string;
      description: string | null;
      created_at: string;
      questions: { id: string; correct_index: number | null }[];
    }[];

    const quizzes: AdminQuizListItem[] = rows.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questionCount: quiz.questions.length,
      unfinishedCount: quiz.questions.filter((q) => q.correct_index === null)
        .length,
      createdAt: quiz.created_at,
    }));

    return { quizzes };
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAdmin();

    const payload = parseQuizPayload(asRecord(await readJson(request)));

    const { data, error } = await supabaseAdmin()
      .from("quizzes")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw dbError(error);

    return { quizId: data.id };
  });
}
