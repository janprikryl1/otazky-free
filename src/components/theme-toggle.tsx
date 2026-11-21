"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { applyTheme, readTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Floats in the corner so it costs no layout space; on a phone every row
 * matters. The moderator has the same choice inside their menu.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setIsReady(true);
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={
        isDark ? "Přepnout na světlý motiv" : "Přepnout na tmavý motiv"
      }
      title={isDark ? "Světlý motiv" : "Tmavý motiv"}
      onClick={() => {
        const next: Theme = isDark ? "light" : "dark";
        applyTheme(next);
        setTheme(next);
      }}
      className={cn(
        "fixed top-3 right-3 z-40 grid size-10 place-items-center rounded-full border border-hairline bg-background/50 text-muted-foreground backdrop-blur-md transition-all",
        "hover:border-primary/40 hover:bg-raised-strong hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      {/* The theme is unknown until the first client render, so the icon
          stays invisible rather than flashing the wrong one. */}
      <span className={isReady ? undefined : "opacity-0"}>
        {isDark ? (
          <SunIcon className="size-5" />
        ) : (
          <MoonIcon className="size-5" />
        )}
      </span>
    </button>
  );
}
