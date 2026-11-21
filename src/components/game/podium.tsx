import { CrownIcon } from "lucide-react";

import type { LeaderboardEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    place: 2,
    height: "h-24 sm:h-36",
    medal: "🥈",
    bg: "bg-gradient-to-b from-zinc-300/90 to-zinc-500/70",
    order: "order-1",
  },
  {
    place: 1,
    height: "h-36 sm:h-52",
    medal: "🥇",
    bg: "bg-gradient-to-b from-primary to-amber-600/80",
    order: "order-2",
  },
  {
    place: 3,
    height: "h-16 sm:h-24",
    medal: "🥉",
    bg: "bg-gradient-to-b from-amber-700/80 to-amber-900/70",
    order: "order-3",
  },
] as const;

/** Slavnostní pódium pro 1.–3. místo. */
export function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const byRank = new Map<number, LeaderboardEntry>();

  for (const entry of entries) {
    if (entry.rank <= 3 && !byRank.has(entry.rank)) {
      byRank.set(entry.rank, entry);
    }
  }

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-5">
      {STEPS.map((step) => {
        const entry = byRank.get(step.place);

        return (
          <div
            key={step.place}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-2",
              step.order,
            )}
          >
            <span className="text-3xl sm:text-5xl">{step.medal}</span>

            <span className="w-full truncate text-center font-bold text-base sm:text-xl">
              {entry?.nickname ?? "—"}
            </span>

            <span className="font-black text-lg text-primary tabular-nums sm:text-2xl">
              {entry ? `${entry.score} b.` : ""}
            </span>

            <div
              className={cn(
                "flex w-full items-start justify-center rounded-t-xl pt-2 shadow-2xl",
                step.height,
                step.bg,
              )}
            >
              <span className="flex items-center gap-1 font-black text-2xl text-black/70 sm:text-4xl">
                {step.place === 1 ? (
                  <CrownIcon className="size-5 sm:size-8" />
                ) : null}
                {step.place}.
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
