"use client";

import type { LucideIcon } from "lucide-react";
import {
  ListChecksIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { apiSend } from "@/lib/fetcher";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export type AdminMenuAction = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Marks the item as irreversible, such as ending the game. */
  danger?: boolean;
};

/**
 * Page-provided menu items live outside the React tree on purpose.
 *
 * The menu and the page are siblings, so a shared context would have to
 * wrap the layout's children — and a client component around postponed
 * server boundaries stops their content from ever being delivered,
 * leaving every page stuck on its loading fallback.
 */
const EMPTY: AdminMenuAction[] = [];

let registered: AdminMenuAction[] = EMPTY;
const listeners = new Set<() => void>();

function publish(next: AdminMenuAction[]) {
  registered = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Adds page items to the menu and clears them on unmount. The caller must
 * memoize `actions`, otherwise registration loops forever.
 */
export function useAdminMenuActions(actions: AdminMenuAction[]) {
  useEffect(() => {
    publish(actions);
    return () => publish(EMPTY);
  }, [actions]);
}

/**
 * Floats in the corner instead of taking a row in the layout: the live
 * game is projected, and every bar steals space from the question.
 */
export function AdminMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const pageActions = useSyncExternalStore(
    subscribe,
    () => registered,
    () => EMPTY,
  );

  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: closing on route change is the point
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen]);

  async function logout() {
    setIsSending(true);

    try {
      await apiSend("/api/admin/logout");
      setIsOpen(false);
      router.replace("/admin");
      router.refresh();
    } finally {
      setIsSending(false);
    }
  }

  const itemClass =
    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left font-semibold text-sm transition-colors disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        aria-label={isOpen ? "Zavřít nabídku" : "Otevřít nabídku"}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "fixed top-3 left-3 z-50 grid size-10 place-items-center rounded-full border border-hairline text-muted-foreground backdrop-blur-md transition-all",
          "hover:border-primary/40 hover:bg-raised-strong hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
          isOpen ? "bg-card text-foreground" : "bg-background/50",
        )}
      >
        {isOpen ? (
          <XIcon className="size-5" />
        ) : (
          <MenuIcon className="size-5" />
        )}
      </button>

      {isOpen ? (
        <>
          {/* click-outside catcher */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="fixed inset-0 z-40 cursor-default bg-black/40"
            onClick={() => setIsOpen(false)}
          />

          <div
            ref={panelRef}
            role="menu"
            tabIndex={-1}
            className="fixed top-15 left-3 z-50 flex w-60 animate-pop-in flex-col gap-1 rounded-xl border border-hairline bg-card p-2 shadow-2xl shadow-shade outline-none"
          >
            {pageActions.map((action) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  action.onSelect();
                }}
                className={cn(
                  itemClass,
                  action.danger
                    ? "hover:bg-destructive/20"
                    : "hover:bg-raised-strong",
                )}
              >
                <action.icon
                  className={cn(
                    "size-4 shrink-0",
                    action.danger ? "text-destructive" : "text-primary",
                  )}
                />
                {action.label}
              </button>
            ))}

            {pageActions.length > 0 ? (
              <span className="my-1 h-px bg-raised-strong" />
            ) : null}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const next: Theme = theme === "dark" ? "light" : "dark";
                applyTheme(next);
                setTheme(next);
              }}
              className={cn(itemClass, "hover:bg-raised-strong")}
            >
              {theme === "dark" ? (
                <SunIcon className="size-4 shrink-0 text-primary" />
              ) : (
                <MoonIcon className="size-4 shrink-0 text-primary" />
              )}
              {theme === "dark" ? "Světlý režim" : "Tmavý režim"}
            </button>

            <Link
              role="menuitem"
              href="/admin"
              className={cn(itemClass, "hover:bg-raised-strong")}
            >
              <ListChecksIcon className="size-4 shrink-0 text-primary" />
              Kvízy
            </Link>

            <button
              type="button"
              role="menuitem"
              disabled={isSending}
              onClick={() => void logout()}
              className={cn(itemClass, "hover:bg-destructive/20")}
            >
              <LogOutIcon className="size-4 shrink-0 text-destructive" />
              {isSending ? "Odhlašuji…" : "Odhlásit"}
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
