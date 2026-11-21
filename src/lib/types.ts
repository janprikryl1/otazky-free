export type GameStatus = "lobby" | "question" | "reveal" | "finished";

export type QuizRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export type QuestionRow = {
  id: string;
  quiz_id: string;
  position: number;
  text: string;
  time_limit: number;
  options: string[];
  correct_index: number | null;
  created_at: string;
};

export type GameSessionRow = {
  id: string;
  quiz_id: string;
  pin: string;
  status: GameStatus;
  current_question_index: number;
  question_started_at: string | null;
  question_ends_at: string | null;
  answers_received: number;
  player_count: number;
  created_at: string;
};

export type PlayerRow = {
  id: string;
  session_id: string;
  nickname: string;
  score: number;
  joined_at: string;
};

export type AnswerRow = {
  id: string;
  session_id: string;
  question_id: string;
  player_id: string;
  option_index: number;
  is_correct: boolean;
  points: number;
  answered_at: string;
};

type Insertable<T, Optional extends keyof T> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;

export type Database = {
  public: {
    Tables: {
      quizzes: {
        Row: QuizRow;
        Insert: Insertable<QuizRow, "id" | "created_at" | "description">;
        Update: Partial<QuizRow>;
        Relationships: [];
      };
      questions: {
        Row: QuestionRow;
        Insert: Insertable<
          QuestionRow,
          "id" | "created_at" | "correct_index" | "position" | "time_limit"
        >;
        Update: Partial<QuestionRow>;
        Relationships: [];
      };
      game_sessions: {
        Row: GameSessionRow;
        Insert: Insertable<
          GameSessionRow,
          | "id"
          | "created_at"
          | "status"
          | "current_question_index"
          | "question_started_at"
          | "question_ends_at"
          | "answers_received"
          | "player_count"
        >;
        Update: Partial<GameSessionRow>;
        Relationships: [];
      };
      players: {
        Row: PlayerRow;
        Insert: Insertable<PlayerRow, "id" | "joined_at" | "score">;
        Update: Partial<PlayerRow>;
        Relationships: [];
      };
      answers: {
        Row: AnswerRow;
        Insert: Insertable<
          AnswerRow,
          "id" | "answered_at" | "is_correct" | "points"
        >;
        Update: Partial<AnswerRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      apply_question_scores: {
        Args: { p_session_id: string; p_question_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type LeaderboardEntry = {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
  lastPoints: number | null;
};

export type SessionSummary = {
  id: string;
  pin: string;
  status: GameStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  playerCount: number;
  answersReceived: number;
  quizTitle: string;
};

/** What a player may see: deliberately without the correct answer. */
export type PublicQuestion = {
  id: string;
  index: number;
  number: number;
  text: string;
  timeLimit: number;
  options: string[];
};

export type RevealInfo = {
  correctIndex: number;
  correctOption: string;
  counts: number[];
  totalAnswers: number;
};

export type PlayerGameState = {
  session: SessionSummary;
  me: {
    id: string;
    nickname: string;
    score: number;
    rank: number;
  } | null;
  question: PublicQuestion | null;
  myAnswerIndex: number | null;
  reveal:
    | (RevealInfo & {
        myPoints: number;
        wasCorrect: boolean;
        didAnswer: boolean;
      })
    | null;
  leaderboard: LeaderboardEntry[];
};

export type AdminQuestion = PublicQuestion & {
  correctIndex: number | null;
};

export type AdminGameState = {
  session: SessionSummary;
  players: { id: string; nickname: string; score: number }[];
  question: AdminQuestion | null;
  reveal: RevealInfo | null;
  leaderboard: LeaderboardEntry[];
  isLastQuestion: boolean;
};

export type AdminQuizListItem = {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  unfinishedCount: number;
  createdAt: string;
};

export type AdminQuizDetail = {
  id: string;
  title: string;
  description: string | null;
  questions: {
    id: string;
    position: number;
    text: string;
    timeLimit: number;
    options: string[];
    correctIndex: number | null;
  }[];
};
