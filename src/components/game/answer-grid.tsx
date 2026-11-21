"use client";

import { CheckIcon, XIcon } from "lucide-react";

import { ANSWER_STYLES } from "@/lib/game";
import { cn } from "@/lib/utils";

type Props = {
  options: string[];
  selectedIndex: number | null;
  /** Only passed in once the question is being revealed. */
  correctIndex?: number | null;
  disabled?: boolean;
  pendingIndex?: number | null;
  onSelect?: (index: number) => void;
};

export function AnswerGrid({
  options,
  selectedIndex,
  correctIndex = null,
  disabled = false,
  pendingIndex = null,
  onSelect,
}: Props) {
  const revealing = correctIndex !== null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((option, index) => {
        const style = ANSWER_STYLES[index] ?? ANSWER_STYLES[0];
        const isSelected = selectedIndex === index;
        const isCorrect = revealing && correctIndex === index;
        const isWrongPick = revealing && isSelected && !isCorrect;
        const dimmed = revealing && !isCorrect && !isSelected;

        return (
          <button
            key={`${index}-${option}`}
            type="button"
            disabled={disabled || revealing}
            aria-pressed={isSelected}
            onClick={() => onSelect?.(index)}
            className={cn(
              "flex min-h-20 w-full items-center gap-3 rounded-xl px-4 py-4 text-left font-bold text-lg text-white shadow-xl transition-all duration-200 sm:min-h-24 sm:text-xl",
              style.bg,
              "ring-white/80 active:scale-[0.98] enabled:hover:brightness-110 disabled:cursor-default",
              isSelected && !revealing && "ring-4 ring-white",
              isCorrect && "ring-4 ring-white brightness-110",
              isWrongPick && "ring-4 ring-white/70",
              dimmed && "opacity-35 saturate-50",
              pendingIndex === index && "animate-pulse",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black/25 font-black text-xl sm:size-12 sm:text-2xl">
              {style.label}
            </span>
            <span className="flex-1 leading-snug">{option}</span>
            {isCorrect ? (
              <CheckIcon className="size-7 shrink-0 stroke-[3]" />
            ) : null}
            {isWrongPick ? (
              <XIcon className="size-7 shrink-0 stroke-[3]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
