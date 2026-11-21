"use client";

import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  CheckIcon,
  ClockIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ErrorNote, Spinner } from "@/components/game/status-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiSend, errorMessage, isUnauthorized } from "@/lib/fetcher";
import { ANSWER_STYLES } from "@/lib/game";
import type { AdminQuizDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

import { QuestionDialog, type QuestionDraft } from "./question-dialog";

export function QuizEditor({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<AdminQuizDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [isTitleOpen, setIsTitleOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setQuiz(await apiGet<AdminQuizDetail>(`/api/admin/quizzes/${quizId}`));
      setError(null);
    } catch (caught) {
      if (isUnauthorized(caught)) {
        router.refresh();
        return;
      }
      setError(errorMessage(caught));
    }
  }, [quizId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setIsBusy(true);
    setError(null);

    try {
      await action();
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!quiz) return;

    const target = index + direction;
    if (target < 0 || target >= quiz.questions.length) return;

    const ids = quiz.questions.map((question) => question.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];

    // optimistické přerovnání, ať UI neposkakuje
    const reordered = [...quiz.questions];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];
    setQuiz({ ...quiz, questions: reordered });

    await run(() =>
      apiSend("/api/admin/questions/reorder", { quizId, orderedIds: ids }),
    );
  }

  async function startGame() {
    setIsBusy(true);
    setError(null);

    try {
      const response = await apiSend<{ sessionId: string }>(
        `/api/admin/quizzes/${quizId}/start`,
      );
      router.push(`/admin/play/${response.sessionId}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setIsBusy(false);
    }
  }

  if (!quiz) {
    return error ? (
      <div className="flex flex-col gap-4">
        <ErrorNote message={error} />
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeftIcon />
            Zpět na kvízy
          </Link>
        </Button>
      </div>
    ) : (
      <Spinner label="Načítám kvíz…" />
    );
  }

  const unfinished = quiz.questions.filter(
    (question) => question.correctIndex === null,
  );

  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="ml-12 self-start">
        <Link href="/admin">
          <ArrowLeftIcon />
          Zpět na kvízy
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-balance-cs font-black text-3xl leading-tight tracking-tight">
            {quiz.title}
          </h1>
          {quiz.description ? (
            <p className="mt-1 text-muted-foreground text-sm">
              {quiz.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTitleOpen(true)}
          >
            <PencilIcon />
            Přejmenovat
          </Button>

          <Button
            size="sm"
            disabled={isBusy || quiz.questions.length === 0}
            onClick={() => void startGame()}
          >
            <PlayIcon />
            Spustit živou hru
          </Button>
        </div>
      </div>

      {error ? <ErrorNote message={error} /> : null}

      {unfinished.length > 0 ? (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangleIcon className="size-5 text-destructive" />
              Chybí {unfinished.length}× správná odpověď
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Doplň ji u otázek{" "}
              <span className="font-bold">
                {unfinished
                  .map((question) => `#${question.position}`)
                  .join(", ")}
              </span>
              . Bez toho se hra nedá spustit.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-xl">
          Otázky{" "}
          <span className="text-muted-foreground">
            ({quiz.questions.length})
          </span>
        </h2>

        <Button
          size="sm"
          onClick={() =>
            setDraft({
              id: null,
              text: "",
              timeLimit: 20,
              options: ["", "", "", ""],
              correctIndex: null,
            })
          }
        >
          <PlusIcon />
          Přidat otázku
        </Button>
      </div>

      <ol className="flex flex-col gap-3">
        {quiz.questions.map((question, index) => (
          <li key={question.id}>
            <Card className="gap-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-raised-strong font-black">
                  {index + 1}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="text-balance-cs font-bold text-lg leading-snug">
                    {question.text}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <ClockIcon />
                      {question.timeLimit} s
                    </Badge>

                    {question.correctIndex === null ? (
                      <Badge variant="destructive">
                        <AlertTriangleIcon />
                        Chybí správná odpověď
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label="Posunout nahoru"
                    disabled={index === 0 || isBusy}
                    onClick={() => void move(index, -1)}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label="Posunout dolů"
                    disabled={index === quiz.questions.length - 1 || isBusy}
                    onClick={() => void move(index, 1)}
                  >
                    <ArrowDownIcon />
                  </Button>
                </div>
              </div>

              <ul className="grid gap-2 sm:grid-cols-2">
                {question.options.map((option, optionIndex) => {
                  const style = ANSWER_STYLES[optionIndex];
                  const isCorrect = question.correctIndex === optionIndex;

                  return (
                    <li
                      key={`${question.id}-${optionIndex}`}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm",
                        isCorrect
                          ? "border-success/60 bg-success/15 font-bold"
                          : "border-hairline bg-raised",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded font-black text-white text-xs",
                          style.bg,
                        )}
                      >
                        {style.label}
                      </span>
                      <span className="min-w-0 flex-1 break-words">
                        {option}
                      </span>
                      {isCorrect ? (
                        <CheckIcon className="size-4 shrink-0 stroke-[3] text-success" />
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      id: question.id,
                      text: question.text,
                      timeLimit: question.timeLimit,
                      options: question.options,
                      correctIndex: question.correctIndex,
                    })
                  }
                >
                  <PencilIcon />
                  Upravit
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/15"
                  disabled={isBusy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Smazat otázku „${question.text}“? Tuto akci nelze vzít zpět.`,
                      )
                    ) {
                      return;
                    }
                    void run(() =>
                      apiSend(
                        `/api/admin/questions/${question.id}`,
                        undefined,
                        "DELETE",
                      ),
                    );
                  }}
                >
                  <Trash2Icon />
                  Smazat
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      {quiz.questions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kvíz je zatím prázdný</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Přidej první otázku tlačítkem výš.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <QuestionDialog
        quizId={quizId}
        draft={draft}
        onClose={() => setDraft(null)}
        onSaved={load}
      />

      <RenameDialog
        quiz={quiz}
        open={isTitleOpen}
        onClose={() => setIsTitleOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

function RenameDialog({
  quiz,
  open,
  onClose,
  onSaved,
}: {
  quiz: AdminQuizDetail;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(quiz.title);
      setDescription(quiz.description ?? "");
      setError(null);
    }
  }, [open, quiz.title, quiz.description]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upravit kvíz</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSending(true);
            setError(null);

            try {
              await apiSend(
                `/api/admin/quizzes/${quiz.id}`,
                { title, description },
                "PATCH",
              );
              onSaved();
              onClose();
            } catch (caught) {
              setError(errorMessage(caught));
            } finally {
              setIsSending(false);
            }
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="rename-title">Název kvízu</Label>
            <Input
              id="rename-title"
              value={title}
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rename-description">Popis</Label>
            <Textarea
              id="rename-description"
              value={description}
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {error ? <ErrorNote message={error} /> : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Zrušit
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? "Ukládám…" : "Uložit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
