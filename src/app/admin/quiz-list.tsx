"use client";

import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  ListChecksIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ErrorNote, Spinner } from "@/components/game/status-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiSend, errorMessage, isUnauthorized } from "@/lib/fetcher";
import type { AdminQuizListItem, GameStatus } from "@/lib/types";

type SessionItem = {
  id: string;
  pin: string;
  status: GameStatus;
  playerCount: number;
  createdAt: string;
  quizTitle: string;
};

const STATUS_LABEL: Record<GameStatus, string> = {
  lobby: "Čekárna",
  question: "Běží otázka",
  reveal: "Vyhodnocení",
  finished: "Dohráno",
};

function plural(count: number, one: string, few: string, many: string) {
  if (count === 1) return one;
  if (count >= 2 && count <= 4) return few;
  return many;
}

export function QuizList() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<AdminQuizListItem[] | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [quizResponse, sessionResponse] = await Promise.all([
        apiGet<{ quizzes: AdminQuizListItem[] }>("/api/admin/quizzes"),
        apiGet<{ sessions: SessionItem[] }>("/api/admin/sessions"),
      ]);

      setQuizzes(quizResponse.quizzes);
      setSessions(sessionResponse.sessions);
      setError(null);
    } catch (caught) {
      if (isUnauthorized(caught)) {
        router.refresh();
        return;
      }
      setError(errorMessage(caught));
      setQuizzes((current) => current ?? []);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function startGame(quizId: string) {
    setBusyId(quizId);
    setError(null);

    try {
      const response = await apiSend<{ sessionId: string; pin: string }>(
        `/api/admin/quizzes/${quizId}/start`,
      );
      router.push(`/admin/play/${response.sessionId}`);
    } catch (caught) {
      if (isUnauthorized(caught)) {
        router.refresh();
        return;
      }
      setError(errorMessage(caught));
      setBusyId(null);
    }
  }

  const liveSessions = sessions.filter(
    (session) => session.status !== "finished",
  );

  if (!quizzes) return <Spinner label="Načítám kvízy…" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3 pl-12">
        <div>
          <h1 className="font-black text-3xl tracking-tight">Kvízy</h1>
          <p className="text-muted-foreground text-sm">
            Uprav otázky, nebo jedním kliknutím spusť živou hru.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCwIcon />
            Obnovit
          </Button>
          <NewQuizDialog onCreated={load} />
        </div>
      </div>

      {error ? <ErrorNote message={error} /> : null}

      {liveSessions.length > 0 ? (
        <Card className="border-primary/40 bg-primary/10">
          <CardHeader>
            <CardTitle className="text-base">Rozehrané hry</CardTitle>
            <CardDescription>
              Vrať se do ovládacího panelu, pokud jsi zavřel okno.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ul className="flex flex-col gap-2">
              {liveSessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-hairline bg-sunken px-3 py-2.5"
                >
                  <span className="font-mono font-black text-lg tracking-widest">
                    {session.pin}
                  </span>
                  <Badge variant="secondary">
                    {STATUS_LABEL[session.status]}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    {session.playerCount}{" "}
                    {plural(session.playerCount, "hráč", "hráči", "hráčů")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground text-sm">
                    {session.quizTitle}
                  </span>
                  <Button asChild size="sm">
                    <Link href={`/admin/play/${session.id}`}>
                      <ExternalLinkIcon />
                      Otevřít
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {quizzes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Zatím tu není žádný kvíz
            </CardTitle>
            <CardDescription>
              Vytvoř první kvíz, nebo spusť seed skript ze souboru{" "}
              <code className="font-mono text-primary">supabase/seed.sql</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {quizzes.map((quiz) => (
          <Card key={quiz.id}>
            <CardHeader>
              <CardTitle className="text-balance-cs">{quiz.title}</CardTitle>
              {quiz.description ? (
                <CardDescription>{quiz.description}</CardDescription>
              ) : null}
            </CardHeader>

            <CardContent className="flex-row flex-wrap gap-2">
              <Badge variant="secondary">
                <ListChecksIcon />
                {quiz.questionCount}{" "}
                {plural(quiz.questionCount, "otázka", "otázky", "otázek")}
              </Badge>

              {quiz.unfinishedCount > 0 ? (
                <Badge variant="destructive">
                  <AlertTriangleIcon />
                  {quiz.unfinishedCount}× chybí správná odpověď
                </Badge>
              ) : (
                <Badge variant="success">Připraveno ke hraní</Badge>
              )}
            </CardContent>

            <CardFooter>
              <Button
                className="flex-1"
                disabled={busyId === quiz.id || quiz.questionCount === 0}
                onClick={() => void startGame(quiz.id)}
              >
                <PlayIcon />
                {busyId === quiz.id ? "Spouštím…" : "Spustit živou hru"}
              </Button>

              <Button asChild variant="outline">
                <Link href={`/admin/quizzes/${quiz.id}`}>
                  <PencilIcon />
                  Upravit
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NewQuizDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSending(true);
    setError(null);

    try {
      await apiSend("/api/admin/quizzes", { title, description });
      setTitle("");
      setDescription("");
      setOpen(false);
      onCreated();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          Nový kvíz
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nový kvíz</DialogTitle>
          <DialogDescription>
            Otázky doplníš hned v dalším kroku.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="quiz-title">Název kvízu</Label>
            <Input
              id="quiz-title"
              value={title}
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="quiz-description">Popis (nepovinný)</Label>
            <Textarea
              id="quiz-description"
              value={description}
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {error ? <ErrorNote message={error} /> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? "Zakládám…" : "Vytvořit kvíz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
