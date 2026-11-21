import { cn } from "@/lib/utils";

function Progress({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-3 w-full overflow-hidden rounded-full bg-sunken",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-200 ease-linear",
          barClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
