"use client";

import { useEffect } from "react";

/** Fires once when mounted. */
export function Confetti() {
  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];

    void (async () => {
      const confetti = (await import("canvas-confetti")).default;
      if (cancelled) return;

      const burst = (particleRatio: number, options: Record<string, unknown>) =>
        confetti({
          origin: { y: 0.65 },
          colors: ["#ffd24a", "#ff5db1", "#5bc0ff", "#5ce08a", "#ffffff"],
          disableForReducedMotion: true,
          particleCount: Math.floor(220 * particleRatio),
          ...options,
        });

      burst(0.3, { spread: 30, startVelocity: 58 });
      burst(0.25, { spread: 65 });
      burst(0.4, { spread: 110, decay: 0.92, scalar: 1.1 });
      burst(0.15, { spread: 130, startVelocity: 28, decay: 0.93, scalar: 1.3 });

      timers.push(
        window.setTimeout(() => {
          burst(0.25, { spread: 80, origin: { x: 0.15, y: 0.6 } });
          burst(0.25, { spread: 80, origin: { x: 0.85, y: 0.6 } });
        }, 900),
      );
    })();

    return () => {
      cancelled = true;
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);

  return null;
}
