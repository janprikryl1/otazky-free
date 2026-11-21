"use client";

import { LockKeyholeIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorNote } from "@/components/game/status-note";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiSend, errorMessage } from "@/lib/fetcher";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password.length === 0) {
      setError("Zadej heslo moderátora.");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await apiSend("/api/admin/login", { password });
      setPassword("");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5">
      <Card>
        <CardHeader className="items-center">
          <span className="mb-1 flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <LockKeyholeIcon className="size-7" />
          </span>
          <CardTitle>Moderátorská část</CardTitle>
          <CardDescription>
            Pro správu kvízů a spuštění hry zadej heslo.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Heslo</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
            />
          </div>

          {error ? <ErrorNote message={error} /> : null}

          <Button type="submit" size="lg" disabled={isSending}>
            {isSending ? "Přihlašuji…" : "Přihlásit se"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
