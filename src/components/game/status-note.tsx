import { AlertTriangleIcon, Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Loader2Icon className="size-8 animate-spin" />
      <p className="font-semibold text-sm">{label}</p>
    </div>
  );
}

export function ErrorNote({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/15 px-3 py-2.5 font-semibold text-destructive-foreground text-sm",
        className,
      )}
    >
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
