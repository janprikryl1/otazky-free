const ANY_WHITESPACE = /[\s   -   　]+/gu;

const CONTROL_CHARS = /\p{Cc}/gu;

const INVISIBLE_CHARS = /[​‌⁠﻿]/gu;

const BIDI_CONTROLS = /[‪-‮⁦-⁩‎‏]/gu;

/**
 * Strips invisible and control characters from user input.
 *
 * The order matters: whitespace (including `\n` and `\t`) collapses to a
 * space first, and only then are the remaining control characters dropped.
 * Reversed, two lines would be glued into a single word.
 */
export function sanitizeText(raw: unknown): string {
  if (typeof raw !== "string") return "";

  return (
    raw
      .normalize("NFC")
      .replace(ANY_WHITESPACE, " ")
      .replace(CONTROL_CHARS, "")
      .replace(INVISIBLE_CHARS, "")
      .replace(BIDI_CONTROLS, "")
      // the removals above can leave double spaces
      .replace(ANY_WHITESPACE, " ")
      .trim()
  );
}

/** Length in characters as a person counts them: one emoji is one. */
export function charLength(value: string): number {
  return [...value].length;
}

/** Truncates without splitting an emoji in half. */
export function truncate(value: string, maxChars: number): string {
  const chars = [...value];
  return chars.length <= maxChars ? value : chars.slice(0, maxChars).join("");
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
