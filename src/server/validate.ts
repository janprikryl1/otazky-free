import { ApiError } from "@/lib/api";
import { charLength, isUuid, sanitizeText, truncate } from "@/lib/text";

export type QuestionPayload = {
  text: string;
  timeLimit: number;
  options: string[];
  correctIndex: number | null;
};

export const MIN_TIME_LIMIT = 5;
export const MAX_TIME_LIMIT = 300;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 4;
export const MAX_NICKNAME_LENGTH = 24;

/** Povinný text – očištěný, s kontrolou délky ve znacích. */
function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") {
    throw new ApiError(`Pole „${field}“ je povinné.`, 400);
  }

  const cleaned = sanitizeText(value);

  if (cleaned === "") {
    throw new ApiError(`Pole „${field}“ nesmí být prázdné.`, 400);
  }
  if (charLength(cleaned) > max) {
    throw new ApiError(`Pole „${field}“ může mít nejvýš ${max} znaků.`, 400);
  }

  return cleaned;
}

/** Identifikátor z adresy nebo z těla požadavku. */
export function parseUuid(value: unknown, field = "Identifikátor"): string {
  if (!isUuid(value)) {
    throw new ApiError(`${field} má neplatný formát.`, 400);
  }
  return value.toLowerCase();
}

export function parseQuizPayload(body: Record<string, unknown>) {
  const rawDescription = sanitizeText(body.description);

  return {
    title: requiredText(body.title, "Název kvízu", 160),
    description: rawDescription === "" ? null : truncate(rawDescription, 500),
  };
}

function parseTimeLimit(raw: unknown): number {
  if (raw === undefined || raw === null) return 20;

  const value = typeof raw === "number" ? raw : Number(raw);

  if (!Number.isFinite(value)) {
    throw new ApiError("Časový limit musí být číslo.", 400);
  }

  const rounded = Math.round(value);

  if (rounded < MIN_TIME_LIMIT || rounded > MAX_TIME_LIMIT) {
    throw new ApiError(
      `Časový limit musí být mezi ${MIN_TIME_LIMIT} a ${MAX_TIME_LIMIT} sekundami.`,
      400,
    );
  }

  return rounded;
}

/**
 * Možnosti odpovědi. Prázdné se zahazují, takže se indexy posunou –
 * správnou odpověď proto mapujeme na původní pozici.
 */
function parseOptions(raw: unknown) {
  if (!Array.isArray(raw)) {
    throw new ApiError("Otázka musí mít seznam možností.", 400);
  }

  if (raw.length > 10) {
    throw new ApiError("Seznam možností je příliš dlouhý.", 400);
  }

  const kept: { text: string; originalIndex: number }[] = [];

  raw.forEach((option, originalIndex) => {
    const cleaned = sanitizeText(option);
    if (cleaned !== "") {
      kept.push({ text: truncate(cleaned, 160), originalIndex });
    }
  });

  if (kept.length < MIN_OPTIONS) {
    throw new ApiError(
      `Otázka musí mít alespoň ${MIN_OPTIONS} vyplněné možnosti.`,
      400,
    );
  }
  if (kept.length > MAX_OPTIONS) {
    throw new ApiError(`Otázka může mít nejvýš ${MAX_OPTIONS} možnosti.`, 400);
  }

  const seen = new Set<string>();
  for (const option of kept) {
    const key = option.text.toLocaleLowerCase("cs");
    if (seen.has(key)) {
      throw new ApiError(
        `Možnost „${option.text}“ je v otázce dvakrát. Každá odpověď musí být jiná.`,
        400,
      );
    }
    seen.add(key);
  }

  return kept;
}

export function parseQuestionPayload(
  body: Record<string, unknown>,
): QuestionPayload {
  const text = requiredText(body.text, "Text otázky", 400);
  const timeLimit = parseTimeLimit(body.timeLimit);
  const options = parseOptions(body.options);

  const rawCorrect = body.correctIndex;
  let correctIndex: number | null = null;

  if (rawCorrect !== null && rawCorrect !== undefined) {
    if (typeof rawCorrect !== "number" || !Number.isInteger(rawCorrect)) {
      throw new ApiError("Označení správné odpovědi je neplatné.", 400);
    }

    const position = options.findIndex(
      (option) => option.originalIndex === rawCorrect,
    );

    if (position === -1) {
      throw new ApiError(
        "Označená správná odpověď neodpovídá žádné vyplněné možnosti.",
        400,
      );
    }

    correctIndex = position;
  }

  return {
    text,
    timeLimit,
    options: options.map((option) => option.text),
    correctIndex,
  };
}

/** Seznam id otázek pro změnu pořadí. */
export function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError("Chybí seznam otázek.", 400);
  }

  if (value.length > 500) {
    throw new ApiError("Seznam otázek je příliš dlouhý.", 400);
  }

  const ids = value.map((item) => parseUuid(item, "Identifikátor otázky"));

  if (new Set(ids).size !== ids.length) {
    throw new ApiError("Seznam otázek obsahuje duplicitní položky.", 400);
  }

  return ids;
}
