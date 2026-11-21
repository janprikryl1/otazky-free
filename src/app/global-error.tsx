"use client";

import { useEffect } from "react";

/**
 * Poslední záchrana – nahrazuje celý dokument, takže nemůže použít
 * komponenty ani globální styly. Proto má styly napsané přímo zde.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[kviz] kritická chyba", error);
  }, [error]);

  return (
    <html lang="cs">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          backgroundColor: "#1b1033",
          color: "#f6f2ff",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.75rem" }}>
            Aplikace se neočekávaně zastavila
          </h1>

          <p style={{ margin: "0 0 1.5rem", opacity: 0.8, lineHeight: 1.5 }}>
            Omlouváme se. Zkus prosím stránku načíst znovu.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.9rem 1.75rem",
              fontSize: "1rem",
              fontWeight: 700,
              backgroundColor: "#f5c518",
              color: "#1b1033",
            }}
          >
            Načíst znovu
          </button>
        </div>
      </body>
    </html>
  );
}
