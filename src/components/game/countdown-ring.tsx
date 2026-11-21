import { cn } from "@/lib/utils";

type Props = {
  secondsLeft: number;
  ratio: number;
  className?: string;
};

/** Kruhový odpočet – červená poslední pětisekundovka. */
export function CountdownRing({ secondsLeft, ratio, className }: Props) {
  const urgent = secondsLeft <= 5;
  const degrees = Math.round(ratio * 360);

  return (
    <div
      className={cn(
        "relative grid size-20 shrink-0 place-items-center rounded-full sm:size-28",
        className,
      )}
      style={{
        background: `conic-gradient(${
          urgent ? "var(--destructive)" : "var(--primary)"
        } ${degrees}deg, color-mix(in oklab, var(--background) 70%, black) 0deg)`,
      }}
      aria-hidden="true"
    >
      <div className="grid size-[82%] place-items-center rounded-full bg-background">
        <span
          className={cn(
            "font-black text-3xl tabular-nums sm:text-4xl",
            urgent ? "text-destructive" : "text-primary",
          )}
        >
          {secondsLeft}
        </span>
      </div>
    </div>
  );
}
