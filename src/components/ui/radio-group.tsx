"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { CheckIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-black/30 text-success-foreground outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 data-[state=checked]:border-success data-[state=checked]:bg-success",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator>
        <CheckIcon className="size-4 stroke-[3.5]" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
