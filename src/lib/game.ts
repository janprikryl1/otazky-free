import { charLength, sanitizeText } from "@/lib/text";
import type { AnswerRow, LeaderboardEntry, PlayerRow } from "@/lib/types";

export const BASE_POINTS = 500;
export const MAX_SPEED_BONUS = 500;
/** Grace period for answers delayed by network latency. */
export const LATE_ANSWER_GRACE_MS = 1200;

export const ANSWER_LABELS = ["A", "B", "C", "D"] as const;

export const ANSWER_STYLES = [
  {
    label: "A",
    bg: "bg-answer-a",
    ring: "ring-answer-a",
    text: "text-answer-a",
  },
  {
    label: "B",
    bg: "bg-answer-b",
    ring: "ring-answer-b",
    text: "text-answer-b",
  },
  {
    label: "C",
    bg: "bg-answer-c",
    ring: "ring-answer-c",
    text: "text-answer-c",
  },
  {
    label: "D",
    bg: "bg-answer-d",
    ring: "ring-answer-d",
    text: "text-answer-d",
  },
] as const;

/** 500 base points plus up to 500 more, scaled by the time left. */
export function calculatePoints(options: {
  timeLimitSeconds: number;
  elapsedMs: number;
}): number {
  const limitMs = Math.max(1, options.timeLimitSeconds * 1000);
  const elapsed = Math.min(Math.max(options.elapsedMs, 0), limitMs);
  const remainingRatio = 1 - elapsed / limitMs;

  return BASE_POINTS + Math.round(MAX_SPEED_BONUS * remainingRatio);
}

export function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Ties share a rank and skip the next one: 1, 2, 2, 4. */
export function buildLeaderboard(
  players: Pick<PlayerRow, "id" | "nickname" | "score" | "joined_at">[],
  lastPointsByPlayer?: Map<string, number>,
): LeaderboardEntry[] {
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.joined_at.localeCompare(b.joined_at);
  });

  let lastScore: number | null = null;
  let lastRank = 0;

  return sorted.map((player, index) => {
    const rank = lastScore === player.score ? lastRank : index + 1;
    lastScore = player.score;
    lastRank = rank;

    return {
      playerId: player.id,
      nickname: player.nickname,
      score: player.score,
      rank,
      lastPoints: lastPointsByPlayer?.get(player.id) ?? null,
    };
  });
}

export function countVotes(
  answers: Pick<AnswerRow, "option_index">[],
  optionCount: number,
): number[] {
  const counts = new Array<number>(optionCount).fill(0);

  for (const answer of answers) {
    if (answer.option_index >= 0 && answer.option_index < optionCount) {
      counts[answer.option_index] += 1;
    }
  }

  return counts;
}

export const MAX_NICKNAME_CHARS = 24;

/** Returns null when the nickname is unusable. */
export function normalizeNickname(raw: unknown): string | null {
  const cleaned = sanitizeText(raw);
  if (cleaned === "") return null;

  const length = charLength(cleaned);
  if (length < 1 || length > MAX_NICKNAME_CHARS) return null;

  return cleaned;
}

export function isValidPin(raw: unknown): raw is string {
  return typeof raw === "string" && /^[0-9]{6}$/.test(raw);
}
