import { CheckIcon } from "lucide-react";

import { ANSWER_STYLES } from "@/lib/game";
import { cn } from "@/lib/utils";

type Props = {
  options: string[];
  counts: number[];
  correctIndex: number;
};

function pluralVotes(count: number): string {
  if (count === 1) return "1 hlas";
  if (count >= 2 && count <= 4) return `${count} hlasy`;
  return `${count} hlasů`;
}

/** Sloupcový graf hlasů u jednotlivých možností. */
export function VoteBars({ options, counts, correctIndex }: Props) {
  const max = Math.max(1, ...counts);

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4">
      {options.map((option, index) => {
        const style = ANSWER_STYLES[index] ?? ANSWER_STYLES[0];
        const count = counts[index] ?? 0;
        const heightPct = Math.max(6, Math.round((count / max) * 100));
        const isCorrect = index === correctIndex;

        return (
          <div
            key={`${index}-${option}`}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <span
              className={cn(
                "font-black text-lg tabular-nums sm:text-2xl",
                isCorrect ? "text-success" : "text-muted-foreground",
              )}
            >
              {count}
            </span>

            <div className="flex h-28 w-full items-end sm:h-44">
              <div
                className={cn(
                  "w-full rounded-t-lg transition-[height] duration-700 ease-out",
                  style.bg,
                  !isCorrect && "opacity-45",
                )}
                style={{ height: `${heightPct}%` }}
              />
            </div>

            <div
              className={cn(
                "flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-center",
                isCorrect ? "bg-success/15" : "bg-raised",
              )}
            >
              <span className="flex items-center gap-1 font-black text-base sm:text-lg">
                {style.label}
                {isCorrect ? (
                  <CheckIcon className="size-4 stroke-[3] text-success" />
                ) : null}
              </span>
              <span className="line-clamp-2 text-[0.7rem] text-muted-foreground leading-tight sm:text-xs">
                {option}
              </span>
              <span className="sr-only">{pluralVotes(count)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
