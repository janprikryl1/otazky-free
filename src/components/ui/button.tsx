import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold outline-none transition-[transform,background-color,box-shadow,color] select-none focus-visible:ring-[3px] focus-visible:ring-ring/60 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "border-2 border-border bg-raised text-foreground hover:border-primary/70 hover:bg-raised-strong",
        ghost: "text-foreground hover:bg-raised-strong",
        destructive:
          "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25 hover:bg-destructive/90",
        success:
          "bg-success text-success-foreground shadow-lg shadow-success/25 hover:bg-success/90",
        accent:
          "bg-accent text-accent-foreground shadow-lg shadow-accent/30 hover:bg-accent/90",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        default: "h-11 px-5 text-base",
        lg: "h-14 px-7 text-lg",
        xl: "h-16 px-8 text-xl [&_svg:not([class*='size-'])]:size-6",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
