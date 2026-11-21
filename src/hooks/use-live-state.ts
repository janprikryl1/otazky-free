"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiGet, errorMessage } from "@/lib/fetcher";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Options = {
  /** Adresa, ze které se stav hry načítá. `null` = zatím nenačítat. */
  url: string | null;
  /** Relace, jejíž změny se odebírají přes Supabase Realtime. */
  sessionId: string | null;
  /** Záložní dotazování, kdyby Realtime spojení vypadlo. */
  pollMs?: number;
  /**
   * Zavolá se při každé neúspěšné odpovědi. Vrátí-li `true`, chybu si
   * volající zpracoval sám a do stavu se nepropíše (třeba vypršené
   * přihlášení moderátora, kde stačí znovu vykreslit stránku).
   */
  onError?: (error: unknown) => boolean | void;
};

/**
 * Drží aktuální stav hry: okamžitě reaguje na Supabase Realtime,
 * záložně se dotazuje v intervalu a vždy se obnoví, když se telefon
 * probudí nebo se karta vrátí do popředí.
 */
export function useLiveState<T>({
  url,
  sessionId,
  pollMs = 6000,
  onError,
}: Options) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const urlRef = useRef(url);
  urlRef.current = url;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const refresh = useCallback(async () => {
    const target = urlRef.current;
    if (!target) return;

    try {
      const next = await apiGet<T>(target);
      setData(next);
      setError(null);
    } catch (caught) {
      if (onErrorRef.current?.(caught) !== true) {
        setError(errorMessage(caught));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // první načtení (a při změně adresy)
  useEffect(() => {
    if (!url) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    void refreshRef.current();
  }, [url]);

  // Supabase Realtime – okamžitá reakce na změnu stavu hry i na nové hráče
  useEffect(() => {
    if (!sessionId) return;

    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`hra-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${sessionId}`,
        },
        () => void refreshRef.current(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${sessionId}`,
        },
        () => void refreshRef.current(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // záložní dotazování
  useEffect(() => {
    if (!url || pollMs <= 0) return;

    const timer = window.setInterval(() => void refreshRef.current(), pollMs);
    return () => window.clearInterval(timer);
  }, [url, pollMs]);

  // probuzení telefonu / návrat do popředí / obnovení připojení
  useEffect(() => {
    if (!url) return;

    const wake = () => {
      if (document.visibilityState === "visible") {
        void refreshRef.current();
      }
    };

    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);

    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
    };
  }, [url]);

  return { data, error, isLoading, refresh, setData };
}
