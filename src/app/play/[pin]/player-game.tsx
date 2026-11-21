"use client";

import {
  CheckCircle2Icon,
  HourglassIcon,
  SendIcon,
  TrophyIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AnswerGrid } from "@/components/game/answer-grid";
import { Confetti } from "@/components/game/confetti";
import { CountdownRing } from "@/components/game/countdown-ring";
import { Leaderboard } from "@/components/game/leaderboard";
import { ErrorNote, Spinner } from "@/components/game/status-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCountdown } from "@/hooks/use-countdown";
import { useLiveState } from "@/hooks/use-live-state";
import { apiSend, errorMessage } from "@/lib/fetcher";
import { ANSWER_STYLES, isValidPin } from "@/lib/game";
import {
  clearStoredPlayer,
  loadStoredPlayer,
  type StoredPlayer,
  shouldForgetPlayer,
  storePlayer,
} from "@/lib/player-storage";
import type { PlayerGameState } from "@/lib/types";

import { JoinForm } from "./join-form";

export function PlayerGame({ pin }: { pin: string }) {
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Nesmyslný PIN v adrese řešíme rovnou, bez zbytečného dotazu na server.
  const hasValidPin = isValidPin(pin);

  // obnova relace po F5 nebo uspání telefonu
  useEffect(() => {
    setPlayer(loadStoredPlayer(pin));
    setIsHydrated(true);
  }, [pin]);

  const stateUrl = useMemo(() => {
    if (!hasValidPin) return null;

    const params = new URLSearchParams({ pin });
    if (player) params.set("playerId", player.playerId);
    return `/api/game/state?${params.toString()}`;
  }, [pin, player, hasValidPin]);

  // Realtime se dá odebírat až od chvíle, kdy známe id relace. Před
  // připojením ho zjistíme z prvního načtení stavu podle PINu.
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { data, error, isLoading, refresh, loadedUrl } =
    useLiveState<PlayerGameState>({
      url: isHydrated ? stateUrl : null,
      sessionId: player?.sessionId ?? sessionId,
    });

  useEffect(() => {
    if (data?.session.id) setSessionId(data.session.id);
  }, [data?.session.id]);

  const handleJoined = useCallback((joined: StoredPlayer) => {
    storePlayer(joined);
    setPlayer(joined);
    setNotice(null);
    // Nenačítáme stav ručně – změnou hráče se změní i adresa dotazu
    // a useLiveState si o nová data řekne sám. Ruční načtení by proběhlo
    // ještě se starou adresou (bez playerId) a tvářilo by se, že hráč
    // ve hře není.
  }, []);

  // hráč už v této hře není (byla vyresetována) → nech ho přihlásit znovu
  useEffect(() => {
    const forget = shouldForgetPlayer({
      hasStoredPlayer: player !== null,
      isMissingFromSession: data !== null && data.me === null,
      loadedUrl,
      currentUrl: stateUrl,
    });

    if (!forget) return;

    clearStoredPlayer(pin);
    setPlayer(null);
    setNotice("Tvoje místo ve hře jsme nenašli – přihlas se prosím znovu.");
  }, [data, player, pin, loadedUrl, stateUrl]);

  if (!hasValidPin) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4">
        <ErrorNote message="Tenhle odkaz nevede do žádné hry – PIN má mít šest číslic." />
        <Button asChild size="lg">
          <Link href="/">Zadat PIN hry</Link>
        </Button>
      </div>
    );
  }

  if (!isHydrated || (isLoading && !data)) {
    return <Spinner label="Načítám hru…" />;
  }

  if (error && !data) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4">
        <ErrorNote message={error} />
        <Button asChild variant="outline" size="lg">
          <Link href="/">Zadat jiný PIN</Link>
        </Button>
      </div>
    );
  }

  if (!player || !data?.me) {
    return (
      <JoinForm
        pin={pin}
        quizTitle={data?.session.quizTitle ?? null}
        notice={notice}
        onJoined={handleJoined}
      />
    );
  }

  return (
    <PlayerScreens
      state={data}
      player={player}
      onRefresh={refresh}
      connectionError={error}
    />
  );
}

type ScreensProps = {
  state: PlayerGameState;
  player: StoredPlayer;
  connectionError: string | null;
  onRefresh: () => void;
};

function PlayerScreens({
  state,
  player,
  connectionError,
  onRefresh,
}: ScreensProps) {
  const me = state.me;
  const { session, question, reveal } = state;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* pr-12 uvolňuje místo plovoucímu přepínači motivu */}
      <header className="flex items-center justify-between gap-3 pr-12">
        <div className="min-w-0">
          <p className="truncate font-bold text-lg leading-tight">
            {me?.nickname}
          </p>
          <p className="font-mono text-muted-foreground text-xs tracking-widest">
            PIN {session.pin}
          </p>
        </div>

        <Badge variant="secondary" className="shrink-0 gap-1.5 px-3 py-1.5">
          <TrophyIcon />
          {me?.score ?? 0} b.
        </Badge>
      </header>

      {connectionError ? <ErrorNote message={connectionError} /> : null}

      {session.status === "lobby" ? (
        <LobbyView
          nickname={me?.nickname ?? ""}
          playerCount={session.playerCount}
        />
      ) : null}

      {session.status === "question" && question ? (
        <QuestionView state={state} player={player} onAnswered={onRefresh} />
      ) : null}

      {session.status === "reveal" && question && reveal ? (
        <RevealView state={state} />
      ) : null}

      {session.status === "finished" ? <FinishedView state={state} /> : null}
    </div>
  );
}

function LobbyView({
  nickname,
  playerCount,
}: {
  nickname: string;
  playerCount: number;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <span className="flex size-20 animate-pulse-ring items-center justify-center rounded-full bg-success/20 text-success">
        <CheckCircle2Icon className="size-11" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-balance-cs font-black text-3xl leading-tight">
          Jsi ve hře, {nickname}!
        </h1>
        <p className="text-balance-cs text-muted-foreground">
          Čekáme, až moderátor spustí kvíz…
        </p>
      </div>

      <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm">
        <UsersIcon />
        Připojeno {playerCount}{" "}
        {playerCount === 1 ? "hráč" : playerCount < 5 ? "hráči" : "hráčů"}
      </Badge>
    </div>
  );
}

function QuestionView({
  state,
  player,
  onAnswered,
}: {
  state: PlayerGameState;
  player: StoredPlayer;
  onAnswered: () => void;
}) {
  const question = state.question;
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [localIndex, setLocalIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastQuestionId = useRef<string | null>(null);

  // nová otázka → vyčisti lokální volbu
  useEffect(() => {
    if (question && lastQuestionId.current !== question.id) {
      lastQuestionId.current = question.id;
      setLocalIndex(null);
      setPendingIndex(null);
      setError(null);
    }
  }, [question]);

  const { secondsLeft, ratio, isOver } = useCountdown(
    state.session.questionEndsAt,
    question?.timeLimit ?? null,
  );

  const selectedIndex = localIndex ?? state.myAnswerIndex;
  const hasAnswered = selectedIndex !== null;

  async function submit(optionIndex: number) {
    if (hasAnswered || pendingIndex !== null || isOver) return;

    setPendingIndex(optionIndex);
    setError(null);

    try {
      await apiSend("/api/game/answer", {
        sessionId: state.session.id,
        playerId: player.playerId,
        optionIndex,
      });
      setLocalIndex(optionIndex);
    } catch (caught) {
      setError(errorMessage(caught));
      onAnswered();
    } finally {
      setPendingIndex(null);
    }
  }

  if (!question) return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-4">
        <CountdownRing secondsLeft={secondsLeft} ratio={ratio} />

        <div className="flex min-w-0 flex-col gap-1">
          <Badge variant="secondary">
            Otázka {question.number} / {state.session.totalQuestions}
          </Badge>
          <h1 className="text-balance-cs font-black text-xl leading-tight sm:text-2xl">
            {question.text}
          </h1>
        </div>
      </div>

      {error ? <ErrorNote message={error} /> : null}

      <AnswerGrid
        options={question.options}
        selectedIndex={selectedIndex}
        disabled={hasAnswered || isOver || pendingIndex !== null}
        pendingIndex={pendingIndex}
        onSelect={submit}
      />

      {hasAnswered ? (
        <div className="flex animate-pop-in items-center justify-center gap-3 rounded-xl border border-success/40 bg-success/15 px-4 py-4 text-center font-bold text-success">
          <SendIcon className="size-5 shrink-0" />
          Odpověď odeslána, čekáme na ostatní…
        </div>
      ) : isOver ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-hairline bg-raised px-4 py-4 text-center font-bold text-muted-foreground">
          <HourglassIcon className="size-5 shrink-0" />
          Čas vypršel – tuhle otázku jsi nestihl.
        </div>
      ) : (
        <p className="text-center text-muted-foreground text-sm">
          Vyber jednu odpověď. Čím dřív, tím víc bodů.
        </p>
      )}
    </div>
  );
}

function RevealView({ state }: { state: PlayerGameState }) {
  const { question, reveal, me } = state;
  if (!question || !reveal) return null;

  const correctLabel = ANSWER_STYLES[reveal.correctIndex]?.label ?? "";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div
        className={`flex animate-pop-in flex-col items-center gap-3 rounded-xl border px-5 py-6 text-center ${
          reveal.wasCorrect
            ? "border-success/50 bg-success/20"
            : "border-destructive/50 bg-destructive/20"
        }`}
      >
        {reveal.wasCorrect ? (
          <CheckCircle2Icon className="size-14 text-success" />
        ) : (
          <XCircleIcon className="size-14 text-destructive" />
        )}

        <p className="font-black text-3xl leading-tight">
          {reveal.wasCorrect
            ? "Správně!"
            : reveal.didAnswer
              ? "Špatně"
              : "Nestihl jsi odpovědět"}
        </p>

        {reveal.wasCorrect ? (
          <p className="font-bold text-success text-xl">
            +{reveal.myPoints} bodů
          </p>
        ) : (
          <p className="text-balance-cs font-semibold">
            Správná odpověď byla{" "}
            <span className="font-black text-primary">
              {correctLabel}) {reveal.correctOption}
            </span>
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{question.text}</CardTitle>
        </CardHeader>
        <CardContent>
          <AnswerGrid
            options={question.options}
            selectedIndex={state.myAnswerIndex}
            correctIndex={reveal.correctIndex}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            <span>Průběžná tabulka</span>
            {me ? (
              <Badge variant="default">
                {me.rank}. místo · {me.score} b.
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Leaderboard
            entries={state.leaderboard}
            highlightPlayerId={me?.id ?? null}
            limit={5}
            showGain
          />
        </CardContent>
      </Card>

      <p className="pb-2 text-center text-muted-foreground text-sm">
        Čekáme na moderátora, až spustí další otázku…
      </p>
    </div>
  );
}

function FinishedView({ state }: { state: PlayerGameState }) {
  const me = state.me;
  const isOnPodium = (me?.rank ?? 99) <= 3;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {isOnPodium ? <Confetti /> : null}

      <div className="flex animate-pop-in flex-col items-center gap-3 rounded-xl border border-primary/50 bg-primary/15 px-5 py-8 text-center">
        <TrophyIcon className="size-14 text-primary" />

        <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
          Konec hry
        </p>

        <p className="font-black text-5xl text-festive leading-none">
          {me?.rank}. místo
        </p>

        <p className="font-bold text-2xl">{me?.score} bodů</p>

        <p className="text-balance-cs text-muted-foreground">
          Díky za hru, {me?.nickname}!
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konečný žebříček</CardTitle>
        </CardHeader>
        <CardContent>
          <Leaderboard
            entries={state.leaderboard}
            highlightPlayerId={me?.id ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
