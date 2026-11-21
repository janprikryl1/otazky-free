import { ApiError, dbError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  AnswerRow,
  GameSessionRow,
  PlayerRow,
  QuestionRow,
  QuizRow,
} from "@/lib/types";

export async function getSessionById(
  sessionId: string,
): Promise<GameSessionRow> {
  const { data, error } = await supabaseAdmin()
    .from("game_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw dbError(error);
  if (!data) throw new ApiError("Hra nebyla nalezena.", 404);

  return data as GameSessionRow;
}

export async function getSessionByPin(pin: string): Promise<GameSessionRow> {
  const { data, error } = await supabaseAdmin()
    .from("game_sessions")
    .select("*")
    .eq("pin", pin)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw dbError(error);
  if (!data) {
    throw new ApiError(
      "Hru s tímto PINem jsme nenašli. Zkontroluj prosím kód.",
      404,
    );
  }

  return data as GameSessionRow;
}

export async function getQuiz(quizId: string): Promise<QuizRow> {
  const { data, error } = await supabaseAdmin()
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .maybeSingle();

  if (error) throw dbError(error);
  if (!data) throw new ApiError("Kvíz nebyl nalezen.", 404);

  return data as QuizRow;
}

export async function getQuestions(quizId: string): Promise<QuestionRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw dbError(error);

  return (data ?? []) as QuestionRow[];
}

export async function getPlayers(sessionId: string): Promise<PlayerRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("players")
    .select("*")
    .eq("session_id", sessionId)
    .order("score", { ascending: false })
    .order("joined_at", { ascending: true });

  if (error) throw dbError(error);

  return (data ?? []) as PlayerRow[];
}

export async function getAnswersForQuestion(
  sessionId: string,
  questionId: string,
): Promise<AnswerRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("answers")
    .select("*")
    .eq("session_id", sessionId)
    .eq("question_id", questionId);

  if (error) throw dbError(error);

  return (data ?? []) as AnswerRow[];
}

export async function getPlayer(
  sessionId: string,
  playerId: string,
): Promise<PlayerRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("players")
    .select("*")
    .eq("session_id", sessionId)
    .eq("id", playerId)
    .maybeSingle();

  if (error) throw dbError(error);

  return (data as PlayerRow | null) ?? null;
}
