/** Jakýkoli bílý znak včetně nezlomitelné mezery a exotických mezer. */
const ANY_WHITESPACE = /[\s   -   　]+/gu;

/** Řídicí znaky C0/C1 (tabulátory a konce řádků už jsou mezerou). */
const CONTROL_CHARS = /\p{Cc}/gu;

/** Neviditelné znaky – nulová mezera, BOM, spojovník slov. */
const INVISIBLE_CHARS = /[​‌⁠﻿]/gu;

/** Přepínače směru textu – dají se zneužít ke zmatení zobrazení. */
const BIDI_CONTROLS = /[‪-‮⁦-⁩‎‏]/gu;

/**
 * Očistí text zadaný uživatelem: sjednotí mezery, zahodí neviditelné
 * a řídicí znaky a ořízne okraje. Vrací prázdný řetězec, pokud po
 * očištění nic nezbude.
 *
 * Pořadí je záměrné – bílé znaky (včetně `\n` a `\t`) se nejdřív změní
 * v mezeru, teprve pak se mažou zbylé řídicí znaky. Jinak by se ze
 * dvou řádků stalo jedno slepené slovo.
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
      // mazání znaků mohlo nechat dvojité mezery
      .replace(ANY_WHITESPACE, " ")
      .trim()
  );
}

/** Délka v znacích tak, jak ji vnímá člověk (emodži = 1 znak). */
export function charLength(value: string): number {
  return [...value].length;
}

/** Ořízne text na daný počet znaků, aniž by rozsekl emodži. */
export function truncate(value: string, maxChars: number): string {
  const chars = [...value];
  return chars.length <= maxChars ? value : chars.slice(0, maxChars).join("");
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
