"use client";

import { useEffect, useId, useState } from "react";

import { ErrorNote } from "@/components/game/status-note";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { apiSend, errorMessage } from "@/lib/fetcher";
import { ANSWER_STYLES } from "@/lib/game";
import { cn } from "@/lib/utils";

const TIME_PRESETS = [10, 15, 20, 30, 45, 60] as const;

export type QuestionDraft = {
  id: string | null;
  text: string;
  timeLimit: number;
  options: string[];
  correctIndex: number | null;
};

type Props = {
  quizId: string;
  draft: QuestionDraft | null;
  onClose: () => void;
  onSaved: () => void;
};

function padOptions(options: string[]): string[] {
  const padded = [...options];
  while (padded.length < 4) padded.push("");
  return padded.slice(0, 4);
}

export function QuestionDialog({ quizId, draft, onClose, onSaved }: Props) {
  const groupId = useId();
  const [text, setText] = useState("");
  const [timeLimit, setTimeLimit] = useState(20);
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!draft) return;

    setText(draft.text);
    setTimeLimit(draft.timeLimit);
    setOptions(padOptions(draft.options));
    setCorrectIndex(draft.correctIndex);
    setError(null);
  }, [draft]);

  const filledCount = options.filter((option) => option.trim() !== "").length;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (text.trim() === "") {
      setError("Vyplň text otázky.");
      return;
    }

    if (filledCount < 2) {
      setError("Otázka musí mít alespoň dvě vyplněné možnosti.");
      return;
    }

    if (correctIndex !== null && options[correctIndex]?.trim() === "") {
      setError("Označená správná odpověď je prázdná. Vyber jinou.");
      return;
    }

    setIsSending(true);
    setError(null);

    // Send all four slots, blanks included. The server prunes them and
    // recomputes the correct index, so that logic lives in one place.
    const payload = { text, timeLimit, options, correctIndex };

    try {
      if (draft?.id) {
        await apiSend(`/api/admin/questions/${draft.id}`, payload, "PATCH");
      } else {
        await apiSend(`/api/admin/quizzes/${quizId}/questions`, payload);
      }
      onSaved();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {draft?.id ? "Upravit otázku" : "Nová otázka"}
          </DialogTitle>
          <DialogDescription>
            Vyplň 2 až 4 možnosti a zaškrtni tu správnou.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="question-text">Text otázky</Label>
            <Textarea
              id="question-text"
              value={text}
              maxLength={400}
              onChange={(event) => setText(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="question-time">Časový limit (sekundy)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="question-time"
                type="number"
                min={5}
                max={300}
                inputMode="numeric"
                value={timeLimit}
                onChange={(event) =>
                  setTimeLimit(Number(event.target.value) || 20)
                }
                className="w-24"
              />
              {TIME_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant={timeLimit === preset ? "default" : "outline"}
                  onClick={() => setTimeLimit(preset)}
                >
                  {preset} s
                </Button>
              ))}
            </div>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
              Možnosti odpovědi
            </legend>

            <RadioGroup
              name={groupId}
              value={correctIndex === null ? "" : String(correctIndex)}
              onValueChange={(value) => setCorrectIndex(Number(value))}
              className="gap-3"
            >
              {options.map((option, index) => {
                const style = ANSWER_STYLES[index];
                const isEmpty = option.trim() === "";

                return (
                  <div key={style.label} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg font-black text-white",
                        style.bg,
                        isEmpty && "opacity-40",
                      )}
                    >
                      {style.label}
                    </span>

                    <Input
                      value={option}
                      maxLength={160}
                      placeholder={
                        index < 2 ? "Povinná možnost" : "Nepovinná možnost"
                      }
                      aria-label={`Možnost ${style.label}`}
                      onChange={(event) => {
                        const next = [...options];
                        next[index] = event.target.value;
                        setOptions(next);
                      }}
                    />

                    <RadioGroupItem
                      value={String(index)}
                      disabled={isEmpty}
                      aria-label={`Označit možnost ${style.label} jako správnou`}
                      title="Správná odpověď"
                    />
                  </div>
                );
              })}
            </RadioGroup>

            <p className="text-muted-foreground text-xs">
              Zelené kolečko vpravo označuje správnou odpověď. Bez jejího
              označení nelze kvíz spustit.
            </p>
          </fieldset>

          {error ? <ErrorNote message={error} /> : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Zrušit
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? "Ukládám…" : "Uložit otázku"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
