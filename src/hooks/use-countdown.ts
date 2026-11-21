"use client";

import { useEffect, useState } from "react";

type Countdown = {
  /** Zbývající sekundy, zaokrouhlené nahoru. */
  secondsLeft: number;
  /** Podíl zbývajícího času (1 = právě začalo, 0 = konec). */
  ratio: number;
  isOver: boolean;
};

/** Odpočet dopočítaný z časů uložených na serveru – odolný proti F5. */
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
