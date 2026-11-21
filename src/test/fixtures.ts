import type { FakeSupabase } from "@/test/fake-supabase";
import { testUuid } from "@/test/fake-supabase";

type QuestionSpec = {
  text: string;
  options: string[];
  correctIndex: number | null;
  timeLimit?: number;
};

const DEFAULT_QUESTIONS: QuestionSpec[] = [
  {
    text: "Co bylo Josefovo první auto?",
    options: ["Trabant", "Škoda 105", "Lada", "Wartburg"],
    correctIndex: 0,
  },
  {
    text: "Kolik stál dům, který koupili?",
    options: ["620 000 Kč", "480 000 Kč", "750 000 Kč"],
    correctIndex: 0,
    timeLimit: 30,
  },
  {
    text: "Kdo Josefa přinesl na svět?",
    options: ["Mikuláš", "Anděl", "Čert", "Maruška Přikrylová"],
    correctIndex: 3,
  },
];

/** Vloží do fake databáze kvíz i s otázkami a vrátí jeho id. */
export function seedQuiz(
  db: FakeSupabase,
  questions: QuestionSpec[] = DEFAULT_QUESTIONS,
): string {
  const quizId = testUuid();

  db.tables.quizzes.push({
    id: quizId,
    title: "Velký kvíz o Josefovi",
    description: null,
    created_at: new Date().toISOString(),
  });

  questions.forEach((question, index) => {
    db.tables.questions.push({
      id: testUuid(),
      quiz_id: quizId,
      position: index + 1,
      text: question.text,
      time_limit: question.timeLimit ?? 20,
      options: question.options,
      correct_index: question.correctIndex,
      created_at: new Date().toISOString(),
    });
  });

  return quizId;
}

/** Přidá hráče přímo do databáze (obchází route handler). */
export function seedPlayer(
  db: FakeSupabase,
  sessionId: string,
  nickname: string,
  joinedAt = new Date().toISOString(),
): string {
  const id = testUuid();

  db.tables.players.push({
    id,
    session_id: sessionId,
    nickname,
    score: 0,
    joined_at: joinedAt,
  });

  const session = db.tables.game_sessions.find((row) => row.id === sessionId);
  if (session) {
    session.player_count = Number(session.player_count) + 1;
  }

  return id;
}

export function sessionRow(db: FakeSupabase, sessionId: string) {
  const row = db.tables.game_sessions.find((item) => item.id === sessionId);
  if (!row) throw new Error("relace nenalezena");
  return row;
}

export function playerRow(db: FakeSupabase, playerId: string) {
  const row = db.tables.players.find((item) => item.id === playerId);
  if (!row) throw new Error("hráč nenalezen");
  return row;
}
