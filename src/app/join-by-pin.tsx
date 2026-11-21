"use client";

import { ArrowRightIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ErrorNote } from "@/components/game/status-note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadLastGamePin } from "@/lib/player-storage";

export function JoinByPin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastPin, setLastPin] = useState<string | null>(null);

  useEffect(() => {
    setLastPin(loadLastGamePin());
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const cleaned = pin.replace(/\D/g, "");

    if (cleaned.length !== 6) {
      setError("PIN hry má šest číslic.");
      return;
    }

    setError(null);
    router.push(`/play/${cleaned}`);
  }

  return (
    <Card className="gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pin">PIN hry</Label>
          <Input
            id="pin"
            name="pin"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            value={pin}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError(null);
            }}
            className="h-20 text-center font-black font-mono text-4xl tracking-[0.35em]"
          />
        </div>

        {error ? <ErrorNote message={error} /> : null}

        <Button type="submit" size="xl" className="w-full">
          Pokračovat
          <ArrowRightIcon />
        </Button>
      </form>

      {lastPin ? (
        <Link
          href={`/play/${lastPin}`}
          className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 font-semibold text-sm transition-colors hover:bg-white/10"
        >
          <RotateCcwIcon className="size-4" />
          Zpátky do hry {lastPin}
        </Link>
      ) : null}
    </Card>
  );
}
