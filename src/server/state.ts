import { ApiError } from "@/lib/api";
import { buildLeaderboard, countVotes } from "@/lib/game";
import type {
  AdminGameState,
  AnswerRow,
  GameSessionRow,
  PlayerGameState,
  PublicQuestion,
  QuestionRow,
  RevealInfo,
  SessionSummary,
} from "@/lib/types";

import { autoRevealIfExpired } from "@/server/game-flow";
import {
  getAnswersForQuestion,
  getPlayer,
  getPlayers,
  getQuestions,
  getQuiz,
  getSessionById,
} from "@/server/queries";

function toPublicQuestion(
  question: QuestionRow,
  index: number,
): PublicQuestion {
  return {
    id: question.id,
    index,
    number: index + 1,
    text: question.text,
    timeLimit: question.time_limit,
    options: question.options,
  };
}

function toSummary(
  session: GameSessionRow,
  totalQuestions: number,
  quizTitle: string,
): SessionSummary {
  return {
    id: session.id,
    pin: session.pin,
    status: session.status,
    currentQuestionIndex: session.current_question_index,
    totalQuestions,
    questionStartedAt: session.question_started_at,
    questionEndsAt: session.question_ends_at,
    playerCount: session.player_count,
    answersReceived: session.answers_received,
    quizTitle,
  };
}

function toReveal(question: QuestionRow, answers: AnswerRow[]): RevealInfo {
  const correctIndex = question.correct_index ?? 0;

  return {
    correctIndex,
    correctOption: question.options[correctIndex] ?? "",
    counts: countVotes(answers, question.options.length),
    totalAnswers: answers.length,
  };
}

type Loaded = {
  session: GameSessionRow;
  questions: QuestionRow[];
  question: QuestionRow | null;
  answers: AnswerRow[];
  quizTitle: string;
};

async function load(sessionId: string): Promise<Loaded> {
  const fresh = await autoRevealIfExpired(await getSessionById(sessionId));

  const [quiz, questions] = await Promise.all([
    getQuiz(fresh.quiz_id),
    getQuestions(fresh.quiz_id),
  ]);

  const question =
    fresh.current_question_index >= 0
      ? (questions[fresh.current_question_index] ?? null)
      : null;

  const answers = question
    ? await getAnswersForQuestion(fresh.id, question.id)
    : [];

  return {
    session: fresh,
    questions,
    question,
    answers,
    quizTitle: quiz.title,
  };
}

/** Stav hry pro telefon hráče – nikdy neobsahuje správnou odpověď předčasně. */
export async function buildPlayerState(
  sessionId: string,
  playerId: string | null,
): Promise<PlayerGameState> {
  const { session, questions, question, answers, quizTitle } =
    await load(sessionId);

  const [players, me] = await Promise.all([
    getPlayers(session.id),
    playerId ? getPlayer(session.id, playerId) : Promise.resolve(null),
  ]);

  const lastPoints = new Map(
    answers.map((answer) => [answer.player_id, answer.points]),
  );
  const leaderboard = buildLeaderboard(players, lastPoints);
  const myEntry = me
    ? (leaderboard.find((row) => row.playerId === me.id) ?? null)
    : null;

  const myAnswer = me
    ? (answers.find((answer) => answer.player_id === me.id) ?? null)
    : null;

  const showQuestion =
    session.status === "question" || session.status === "reveal";
  const isReveal = session.status === "reveal";

  return {
    session: toSummary(session, questions.length, quizTitle),
    me:
      me && myEntry
        ? {
            id: me.id,
            nickname: me.nickname,
            // Body za právě běžící otázku se připisují až při vyhodnocení,
            // takže skóre nikdy neprozradí, jestli hráč odpověděl správně.
            score: me.score,
            rank: myEntry.rank,
          }
        : null,
    question:
      showQuestion && question
        ? toPublicQuestion(question, session.current_question_index)
        : null,
    myAnswerIndex: myAnswer?.option_index ?? null,
    reveal:
      isReveal && question
        ? {
            ...toReveal(question, answers),
            myPoints: myAnswer?.points ?? 0,
            wasCorrect: myAnswer?.is_correct ?? false,
            didAnswer: myAnswer !== null,
          }
        : null,
    leaderboard: isReveal || session.status === "finished" ? leaderboard : [],
  };
}

/** Stav hry pro panel moderátora – obsahuje i správné odpovědi. */
export async function buildAdminState(
  sessionId: string,
): Promise<AdminGameState> {
  const { session, questions, question, answers, quizTitle } =
    await load(sessionId);

  const players = await getPlayers(session.id);
  const lastPoints = new Map(
    answers.map((answer) => [answer.player_id, answer.points]),
  );

  return {
    session: toSummary(session, questions.length, quizTitle),
    players: players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      score: player.score,
    })),
    question: question
      ? {
          ...toPublicQuestion(question, session.current_question_index),
          correctIndex: question.correct_index,
        }
      : null,
    reveal:
      session.status === "reveal" && question
        ? toReveal(question, answers)
        : null,
    leaderboard: buildLeaderboard(players, lastPoints),
    isLastQuestion: session.current_question_index >= questions.length - 1,
  };
}

export function assertPlayerBelongs(
  session: GameSessionRow,
  playerSessionId: string,
) {
  if (session.id !== playerSessionId) {
    throw new ApiError("Hráč nepatří do této hry.", 403);
  }
}
