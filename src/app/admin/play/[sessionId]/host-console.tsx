"use client";

import {
  ArrowRightIcon,
  CheckCircle2Icon,
  FlagIcon,
  HomeIcon,
  PlayIcon,
  SquareIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AdminMenuAction,
  useAdminMenuActions,
} from "@/app/admin/admin-menu";

import { Confetti } from "@/components/game/confetti";
import { CountdownRing } from "@/components/game/countdown-ring";
import { Leaderboard } from "@/components/game/leaderboard";
import { Podium } from "@/components/game/podium";
import { ErrorNote, Spinner } from "@/components/game/status-note";
import { VoteBars } from "@/components/game/vote-bars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCountdown } from "@/hooks/use-countdown";
import { useLiveState } from "@/hooks/use-live-state";
import { apiSend, errorMessage, isUnauthorized } from "@/lib/fetcher";
import { ANSWER_STYLES } from "@/lib/game";
import type { AdminGameState } from "@/lib/types";

type Action = "start" | "reveal" | "next" | "finish";

function plural(count: number, one: string, few: string, many: string) {
  if (count === 1) return one;
  if (count >= 2 && count <= 4) return few;
  return many;
}

export function HostConsole({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  // expired moderator cookie sends us back to the sign-in screen
  const handleAuthError = useCallback(
    (caught: unknown) => {
      if (!isUnauthorized(caught)) return false;
      router.refresh();
      return true;
    },
    [router],
  );

  const { data, error, isLoading, refresh, setData } =
    useLiveState<AdminGameState>({
      url: `/api/admin/sessions/${sessionId}/state`,
      sessionId,
      pollMs: 4000,
      onError: handleAuthError,
    });

  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const act = useCallback(
    async (action: Action) => {
      setIsBusy(true);
      setActionError(null);

      try {
        setData(
          await apiSend<AdminGameState>(
            `/api/admin/sessions/${sessionId}/advance`,
            { action },
          ),
        );
      } catch (caught) {
        if (!handleAuthError(caught)) {
          setActionError(errorMessage(caught));
          void refresh();
        }
      } finally {
        setIsBusy(false);
      }
    },
    [sessionId, refresh, setData, handleAuthError],
  );

  const removePlayer = useCallback(
    async (playerId: string) => {
      setIsBusy(true);
      setActionError(null);

      try {
        setData(
          await apiSend<AdminGameState>(
            `/api/admin/sessions/${sessionId}/players/${playerId}`,
            undefined,
            "DELETE",
          ),
        );
      } catch (caught) {
        if (!handleAuthError(caught)) {
          setActionError(errorMessage(caught));
          void refresh();
        }
      } finally {
        setIsBusy(false);
      }
    },
    [sessionId, refresh, setData, handleAuthError],
  );

  const status = data?.session.status;
  const canFinish = status !== undefined && status !== "finished";

  const menuActions = useMemo<AdminMenuAction[]>(() => {
    if (!canFinish) return [];

    return [
      {
        label: "Ukončit hru",
        icon: SquareIcon,
        danger: true,
        onSelect: () => {
          if (window.confirm("Opravdu ukončit celou hru?")) {
            void act("finish");
          }
        },
      },
    ];
  }, [canFinish, act]);

  useAdminMenuActions(menuActions);

  if (isLoading && !data) return <Spinner label="Načítám hru…" />;

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorNote message={error ?? "Hru se nepodařilo načíst."} />
        <Button asChild variant="outline">
          <Link href="/admin">
            <HomeIcon />
            Zpět na kvízy
          </Link>
        </Button>
      </div>
    );
  }

  const { session } = data;

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* pl-12 keeps the corner clear for the floating menu button */}
      <header className="flex flex-wrap items-center justify-between gap-3 pl-12">
        <div className="min-w-0">
          <h1 className="truncate font-black text-2xl tracking-tight">
            {session.quizTitle}
          </h1>
          <p className="text-muted-foreground text-sm">
            {session.status === "lobby"
              ? "Čekárna – hráči se připojují"
              : session.status === "finished"
                ? "Hra dohraná"
                : `Otázka ${session.currentQuestionIndex + 1} z ${session.totalQuestions}`}
          </p>
        </div>

        {/* Ending the game and the quizzes link live in the floating menu,
            to keep controls off the projected screen. */}
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
          <UsersIcon />
          {session.playerCount}
        </Badge>
      </header>

      {actionError ? <ErrorNote message={actionError} /> : null}
      {error && !actionError ? <ErrorNote message={error} /> : null}

      {session.status === "lobby" ? (
        <LobbyPhase
          state={data}
          isBusy={isBusy}
          onStart={() => act("start")}
          onRemovePlayer={removePlayer}
        />
      ) : null}

      {session.status === "question" ? (
        <QuestionPhase
          state={data}
          isBusy={isBusy}
          onReveal={() => act("reveal")}
        />
      ) : null}

      {session.status === "reveal" ? (
        <RevealPhase state={data} isBusy={isBusy} onNext={() => act("next")} />
      ) : null}

      {session.status === "finished" ? <FinishedPhase state={data} /> : null}
    </div>
  );
}

function LobbyPhase({
  state,
  isBusy,
  onStart,
  onRemovePlayer,
}: {
  state: AdminGameState;
  isBusy: boolean;
  onStart: () => void;
  onRemovePlayer: (playerId: string) => void;
}) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const joinUrl = useMemo(
    () => (origin ? `${origin}/play/${state.session.pin}` : ""),
    [origin, state.session.pin],
  );

  return (
    <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="items-center justify-center text-center">
        <CardHeader className="items-center">
          <CardTitle className="text-lg">Naskenuj a hraj</CardTitle>
        </CardHeader>

        <div className="rounded-2xl bg-white p-4 shadow-2xl">
          {joinUrl ? (
            <QRCodeSVG
              value={joinUrl}
              size={260}
              level="M"
              marginSize={0}
              className="h-auto w-full max-w-[260px]"
            />
          ) : (
            <div className="size-[260px] animate-pulse rounded-lg bg-zinc-200" />
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="font-semibold text-muted-foreground text-sm uppercase tracking-widest">
            PIN hry
          </p>
          <p className="font-black font-mono text-5xl text-festive tracking-[0.15em] sm:text-6xl">
            {state.session.pin}
          </p>
          <p className="break-all text-muted-foreground text-xs">{joinUrl}</p>
        </div>

        <Button
          size="xl"
          className="w-full"
          disabled={isBusy || state.session.playerCount === 0}
          onClick={onStart}
        >
          <PlayIcon />
          {isBusy ? "Spouštím…" : "Spustit kvíz"}
        </Button>

        {state.session.playerCount === 0 ? (
          <p className="text-muted-foreground text-sm">
            Počkej, až se připojí první hráč.
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-lg">
            <span>Připojení hráči</span>
            <Badge variant="default" className="text-sm">
              {state.session.playerCount}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {state.players.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Zatím se nikdo nepřipojil…
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {state.players.map((player) => (
                <li
                  key={player.id}
                  className="flex animate-pop-in items-center gap-1 rounded-full border border-primary/40 bg-primary/15 py-1 pr-1 pl-4 font-bold text-base"
                >
                  {player.nickname}
                  <button
                    type="button"
                    disabled={isBusy}
                    aria-label={`Odebrat hráče ${player.nickname}`}
                    title="Odebrat ze hry"
                    className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Odebrat hráče „${player.nickname}“ ze hry?`,
                        )
                      ) {
                        onRemovePlayer(player.id);
                      }
                    }}
                  >
                    <XIcon className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionPhase({
  state,
  isBusy,
  onReveal,
}: {
  state: AdminGameState;
  isBusy: boolean;
  onReveal: () => void;
}) {
  const question = state.question;
  const { secondsLeft, ratio, isOver } = useCountdown(
    state.session.questionEndsAt,
    question?.timeLimit ?? null,
  );

  // close the vote automatically once the time runs out
  const revealedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!question || !isOver || isBusy) return;
    if (revealedFor.current === question.id) return;

    revealedFor.current = question.id;
    onReveal();
  }, [isOver, question, isBusy, onReveal]);

  if (!question) return null;

  const answered = state.session.answersReceived;
  const total = state.session.playerCount;
  const everyoneAnswered = total > 0 && answered >= total;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <Card className="items-center gap-6 text-center">
        <Badge variant="secondary" className="text-sm">
          Otázka {question.number} / {state.session.totalQuestions}
        </Badge>

        <h2 className="text-balance-cs font-black text-3xl leading-tight sm:text-5xl">
          {question.text}
        </h2>

        <div className="flex w-full flex-wrap items-center justify-center gap-6">
          <CountdownRing secondsLeft={secondsLeft} ratio={ratio} />

          <div className="flex min-w-48 flex-col gap-2">
            <p className="font-bold text-xl">
              Odpovědělo: {answered} / {total}{" "}
              {plural(total, "hráč", "hráči", "hráčů")}
            </p>
            <Progress
              value={total > 0 ? (answered / total) * 100 : 0}
              barClassName={everyoneAnswered ? "bg-success" : undefined}
            />
            {everyoneAnswered ? (
              <p className="flex items-center justify-center gap-1.5 font-semibold text-sm text-success">
                <CheckCircle2Icon className="size-4" />
                Odpověděli všichni
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((option, index) => {
          const style = ANSWER_STYLES[index] ?? ANSWER_STYLES[0];

          return (
            <div
              key={`${index}-${option}`}
              className={`flex min-h-20 items-center gap-3 rounded-xl px-4 py-4 font-bold text-lg text-white shadow-xl sm:text-2xl ${style.bg}`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black/25 font-black sm:size-12">
                {style.label}
              </span>
              <span className="flex-1 leading-snug">{option}</span>
            </div>
          );
        })}
      </div>

      <Button
        size="xl"
        variant="accent"
        className="w-full"
        disabled={isBusy}
        onClick={onReveal}
      >
        <FlagIcon />
        Ukončit otázku hned
      </Button>
    </div>
  );
}

function RevealPhase({
  state,
  isBusy,
  onNext,
}: {
  state: AdminGameState;
  isBusy: boolean;
  onNext: () => void;
}) {
  const { question, reveal } = state;
  if (!question || !reveal) return null;

  const correctLabel = ANSWER_STYLES[reveal.correctIndex]?.label ?? "";

  return (
    <div className="flex flex-1 flex-col gap-5">
      <Card className="gap-5">
        <CardHeader className="items-center text-center">
          <Badge variant="secondary">
            Otázka {question.number} / {state.session.totalQuestions}
          </Badge>
          <CardTitle className="text-balance-cs text-2xl sm:text-3xl">
            {question.text}
          </CardTitle>
        </CardHeader>

        <div className="flex animate-pop-in flex-col items-center gap-2 rounded-xl border border-success/50 bg-success/15 px-5 py-4 text-center">
          <p className="font-semibold text-sm uppercase tracking-widest text-success">
            Správná odpověď
          </p>
          <p className="text-balance-cs font-black text-2xl sm:text-3xl">
            {correctLabel}) {reveal.correctOption}
          </p>
        </div>

        <VoteBars
          options={question.options}
          counts={reveal.counts}
          correctIndex={reveal.correctIndex}
        />

        <p className="text-center text-muted-foreground text-sm">
          Odpovědělo {reveal.totalAnswers} z {state.session.playerCount}{" "}
          {plural(state.session.playerCount, "hráče", "hráčů", "hráčů")}
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Průběžná tabulka</CardTitle>
        </CardHeader>
        <CardContent>
          <Leaderboard entries={state.leaderboard} limit={10} showGain />
        </CardContent>
      </Card>

      <Button size="xl" className="w-full" disabled={isBusy} onClick={onNext}>
        {state.isLastQuestion ? <FlagIcon /> : <ArrowRightIcon />}
        {isBusy
          ? "Pokračuji…"
          : state.isLastQuestion
            ? "Vyhlásit výsledky"
            : "Další otázka"}
      </Button>
    </div>
  );
}

function FinishedPhase({ state }: { state: AdminGameState }) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <Confetti />

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-black text-4xl text-festive leading-tight sm:text-5xl">
          Gratulujeme!
        </h2>
        <p className="text-muted-foreground">
          Konečné výsledky kvízu „{state.session.quizTitle}“
        </p>
      </div>

      <Podium entries={state.leaderboard} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kompletní žebříček</CardTitle>
        </CardHeader>
        <CardContent>
          <Leaderboard entries={state.leaderboard} />
        </CardContent>
      </Card>
    </div>
  );
}
