"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiGet, errorMessage } from "@/lib/fetcher";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Options = {
  /** `null` means do not fetch yet. */
  url: string | null;
  sessionId: string | null;
  /** Fallback polling in case the Realtime socket drops. */
  pollMs?: number;
  /** Return true to say the error was handled and should not be shown. */
  onError?: (error: unknown) => boolean | undefined;
};

/**
 * Keeps game state current: Realtime for immediate updates, interval polling
 * as a fallback, and a refetch whenever the phone wakes or the tab returns.
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
  // lets the caller tell whether the data matches what it asks for now
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

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
      setLoadedUrl(target);
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

  useEffect(() => {
    if (!url) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    void refreshRef.current();
  }, [url]);

  // Realtime: immediate reaction to state changes and to new players
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

  // fallback polling
  useEffect(() => {
    if (!url || pollMs <= 0) return;

    const timer = window.setInterval(() => void refreshRef.current(), pollMs);
    return () => window.clearInterval(timer);
  }, [url, pollMs]);

  // phone waking up, tab returning to the foreground, network back
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

  return { data, error, isLoading, refresh, setData, loadedUrl };
}
