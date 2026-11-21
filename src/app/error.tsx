"use client";

import { AlertTriangleIcon, HomeIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[quiz] route error", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <Card>
        <CardHeader className="items-center text-center">
          <span className="mb-1 flex size-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive">
            <AlertTriangleIcon className="size-7" />
          </span>
          <CardTitle>Něco se pokazilo</CardTitle>
          <CardDescription>
            Stránku se nepodařilo zobrazit. Zkus to prosím znovu – hra mezitím
            běží dál a o body nepřijdeš.
          </CardDescription>
        </CardHeader>

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={reset}>
            <RotateCcwIcon />
            Zkusit znovu
          </Button>

          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <HomeIcon />
              Na úvodní stránku
            </Link>
          </Button>
        </div>

        {error.digest ? (
          <p className="text-center font-mono text-muted-foreground text-xs">
            Kód chyby: {error.digest}
          </p>
        ) : null}
      </Card>
    </main>
  );
}
