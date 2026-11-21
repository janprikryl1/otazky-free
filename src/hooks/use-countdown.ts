"use client";

import { useEffect, useState } from "react";

type Countdown = {
  secondsLeft: number;
  /** Share of time left: 1 at the start, 0 at the end. */
  ratio: number;
  isOver: boolean;
};

/** Derived from server timestamps, so a reload does not reset it. */
export function useCountdown(
  endsAt: string | null,
  timeLimitSeconds: number | null,
): Countdown {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;

    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 200);

    return () => window.clearInterval(timer);
  }, [endsAt]);

  if (!endsAt) {
    return { secondsLeft: 0, ratio: 0, isOver: true };
  }

  const end = new Date(endsAt).getTime();

  if (Number.isNaN(end)) {
    return { secondsLeft: 0, ratio: 0, isOver: true };
  }

  const remainingMs = Math.max(0, end - now);
  const limitMs = Math.max(1, (timeLimitSeconds ?? 20) * 1000);

  return {
    secondsLeft: Math.ceil(remainingMs / 1000),
    ratio: Math.min(1, remainingMs / limitMs),
    isOver: remainingMs <= 0,
  };
}
