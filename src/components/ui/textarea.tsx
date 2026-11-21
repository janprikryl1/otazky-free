import type * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-20 w-full rounded-lg border-2 border-input bg-sunken px-4 py-3 text-base text-foreground shadow-inner outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
