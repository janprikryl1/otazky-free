import { CrownIcon } from "lucide-react";

import type { LeaderboardEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const MEDAL = ["🥇", "🥈", "🥉"] as const;

type Props = {
  entries: LeaderboardEntry[];
  highlightPlayerId?: string | null;
  limit?: number;
  showGain?: boolean;
  emptyLabel?: string;
};

export function Leaderboard({
  entries,
  highlightPlayerId = null,
  limit,
  showGain = false,
  emptyLabel = "Zatím tu nikdo není.",
}: Props) {
  const visible = typeof limit === "number" ? entries.slice(0, limit) : entries;

  if (visible.length === 0) {
    return (
      <p className="py-6 text-center text-muted-foreground text-sm">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {visible.map((entry) => {
        const isMe = entry.playerId === highlightPlayerId;
        const medal = entry.rank <= 3 ? MEDAL[entry.rank - 1] : null;

        return (
          <li
            key={entry.playerId}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
              isMe
                ? "border-primary/60 bg-primary/15"
                : "border-white/10 bg-white/5",
            )}
          >
            <span className="flex w-9 shrink-0 justify-center font-black text-lg tabular-nums">
              {medal ?? entry.rank}
            </span>

            <span className="min-w-0 flex-1 truncate font-semibold text-base">
              {entry.nickname}
              {isMe ? (
                <span className="ml-2 font-bold text-primary text-xs uppercase">
                  ty
                </span>
              ) : null}
            </span>

            {showGain && entry.lastPoints ? (
              <span className="shrink-0 font-bold text-success text-sm tabular-nums">
                +{entry.lastPoints}
              </span>
            ) : null}

            <span className="flex shrink-0 items-center gap-1.5 font-black text-lg tabular-nums">
              {entry.rank === 1 ? (
                <CrownIcon className="size-4 text-primary" />
              ) : null}
              {entry.score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
