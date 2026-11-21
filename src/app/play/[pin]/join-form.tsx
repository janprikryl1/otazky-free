"use client";

import { LogInIcon, PartyPopperIcon } from "lucide-react";
import { useState } from "react";

import { ErrorNote } from "@/components/game/status-note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiSend, errorMessage } from "@/lib/fetcher";
import type { StoredPlayer } from "@/lib/player-storage";

type JoinResponse = {
  playerId: string;
  nickname: string;
  sessionId: string;
  pin: string;
};

type Props = {
  pin: string;
  quizTitle: string | null;
  notice?: string | null;
  onJoined: (player: StoredPlayer) => void;
};

export function JoinForm({ pin, quizTitle, notice, onJoined }: Props) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const cleaned = nickname.replace(/\s+/g, " ").trim();

    if (cleaned.length === 0) {
      setError("Zadej prosím svou přezdívku.");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await apiSend<JoinResponse>("/api/game/join", {
        pin,
        nickname: cleaned,
      });

      onJoined({
        playerId: response.playerId,
        sessionId: response.sessionId,
        pin: response.pin,
        nickname: response.nickname,
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <PartyPopperIcon className="size-8" />
        </span>

        <h1 className="text-balance-cs font-black text-3xl text-festive leading-tight">
          {quizTitle ?? "Narozeninový kvíz"}
        </h1>

        <p className="font-mono font-semibold text-muted-foreground tracking-[0.3em]">
          PIN {pin}
        </p>
      </header>

      {notice ? <ErrorNote message={notice} /> : null}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nickname">Tvoje přezdívka</Label>
            <Input
              id="nickname"
              name="nickname"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="go"
              maxLength={24}
              placeholder="Např. Verunka"
              value={nickname}
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                setNickname(event.target.value);
                setError(null);
              }}
              className="h-16 text-center font-bold text-2xl"
            />
          </div>

          {error ? <ErrorNote message={error} /> : null}

          <Button
            type="submit"
            size="xl"
            className="w-full"
            disabled={isSending}
          >
            <LogInIcon />
            {isSending ? "Připojuji…" : "Vstoupit do hry"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
