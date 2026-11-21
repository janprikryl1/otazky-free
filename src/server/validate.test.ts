import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import {
  parseIdList,
  parseQuestionPayload,
  parseQuizPayload,
  parseUuid,
} from "@/server/validate";

const UUID_A = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const UUID_B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

/** Zachytí ApiError a vrátí ho, ať se dá zkontrolovat text i stav. */
function caught(fn: () => unknown): ApiError {
  try {
    fn();
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("očekávali jsme ApiError, ale nic se nevyhodilo");
}

describe("parseUuid", () => {
  it("přijme platné UUID a převede ho na malá písmena", () => {
    expect(parseUuid(UUID_A.toUpperCase())).toBe(UUID_A);
  });

  it("odmítne neplatný identifikátor s českou hláškou", () => {
    const error = caught(() => parseUuid("../../etc/passwd", "Identifikátor kvízu"));
    expect(error.status).toBe(400);
    expect(error.message).toBe("Identifikátor kvízu má neplatný formát.");
  });

  it("odmítne pokus o vložení SQL i jiné typy", () => {
    expect(() => parseUuid("' OR 1=1 --")).toThrow(ApiError);
    expect(() => parseUuid(null)).toThrow(ApiError);
    expect(() => parseUuid({ id: UUID_A })).toThrow(ApiError);
  });
});

describe("parseQuizPayload", () => {
  it("očistí název a popis", () => {
    expect(
      parseQuizPayload({ title: "  Kvíz  o\nJosefovi ", description: "  " }),
    ).toEqual({ title: "Kvíz o Josefovi", description: null });
  });

  it("odmítne prázdný i chybějící název", () => {
    expect(caught(() => parseQuizPayload({ title: "   " })).message).toBe(
      "Pole „Název kvízu“ nesmí být prázdné.",
    );
    expect(caught(() => parseQuizPayload({})).message).toBe(
      "Pole „Název kvízu“ je povinné.",
    );
  });

  it("odmítne příliš dlouhý název", () => {
    const error = caught(() => parseQuizPayload({ title: "a".repeat(161) }));
    expect(error.message).toContain("nejvýš 160 znaků");
  });

  it("ořízne příliš dlouhý popis místo chyby", () => {
    const result = parseQuizPayload({
      title: "Kvíz",
      description: "b".repeat(900),
    });
    expect(result.description).toHaveLength(500);
  });
});

describe("parseQuestionPayload", () => {
  const valid = {
    text: "Kolik má Josef dnes let?",
    timeLimit: 20,
    options: ["58", "59", "60", "61"],
    correctIndex: 2,
  };

  it("přijme platnou otázku", () => {
    expect(parseQuestionPayload({ ...valid })).toEqual({
      text: "Kolik má Josef dnes let?",
      timeLimit: 20,
      options: ["58", "59", "60", "61"],
      correctIndex: 2,
    });
  });

  it("zahodí prázdné možnosti a přepočítá index správné odpovědi", () => {
    // tvůrce vyplnil sloty A, B a D a jako správnou označil D (index 3)
    const result = parseQuestionPayload({
      ...valid,
      options: ["Trabant", "Škoda 105", "   ", "Wartburg"],
      correctIndex: 3,
    });

    expect(result.options).toEqual(["Trabant", "Škoda 105", "Wartburg"]);
    expect(result.correctIndex).toBe(2);
    expect(result.options[result.correctIndex as number]).toBe("Wartburg");
  });

  it("odmítne správnou odpověď ukazující na prázdnou možnost", () => {
    const error = caught(() =>
      parseQuestionPayload({
        ...valid,
        options: ["Ano", "Ne", "", ""],
        correctIndex: 2,
      }),
    );
    expect(error.message).toContain("neodpovídá žádné vyplněné možnosti");
  });

  it("dovolí otázku bez označené správné odpovědi (seed)", () => {
    const result = parseQuestionPayload({ ...valid, correctIndex: null });
    expect(result.correctIndex).toBeNull();

    const { correctIndex: _omitted, ...withoutKey } = valid;
    expect(parseQuestionPayload(withoutKey).correctIndex).toBeNull();
  });

  it("odmítne neceločíselné označení správné odpovědi", () => {
    expect(() =>
      parseQuestionPayload({ ...valid, correctIndex: 1.5 }),
    ).toThrow(ApiError);
    expect(() =>
      parseQuestionPayload({ ...valid, correctIndex: "2" }),
    ).toThrow(ApiError);
  });

  it("vyžaduje dvě až čtyři možnosti", () => {
    expect(
      caught(() => parseQuestionPayload({ ...valid, options: ["Ano"] })).message,
    ).toContain("alespoň 2");

    expect(
      caught(() =>
        parseQuestionPayload({
          ...valid,
          options: ["a", "b", "c", "d", "e"],
          correctIndex: 0,
        }),
      ).message,
    ).toContain("nejvýš 4");

    expect(() =>
      parseQuestionPayload({ ...valid, options: "ano,ne" }),
    ).toThrow(ApiError);
  });

  it("odmítne dvě stejné možnosti", () => {
    const error = caught(() =>
      parseQuestionPayload({
        ...valid,
        options: ["Trabant", "trabant", "Wartburg"],
        correctIndex: 0,
      }),
    );
    expect(error.message).toContain("dvakrát");
  });

  it("hlídá rozsah časového limitu", () => {
    expect(() => parseQuestionPayload({ ...valid, timeLimit: 4 })).toThrow(
      ApiError,
    );
    expect(() => parseQuestionPayload({ ...valid, timeLimit: 301 })).toThrow(
      ApiError,
    );
    expect(() =>
      parseQuestionPayload({ ...valid, timeLimit: Number.NaN }),
    ).toThrow(ApiError);
    expect(() =>
      parseQuestionPayload({ ...valid, timeLimit: Number.POSITIVE_INFINITY }),
    ).toThrow(ApiError);
  });

  it("chybějící limit doplní na 20 sekund", () => {
    const { timeLimit: _omitted, ...withoutLimit } = valid;
    expect(parseQuestionPayload(withoutLimit).timeLimit).toBe(20);
  });

  it("očistí text otázky i možností od neviditelných znaků", () => {
    const result = parseQuestionPayload({
      ...valid,
      text: "Kolik​ má Josef let?",
      options: ["58​", " 59 ", "60", "61"],
    });

    expect(result.text).toBe("Kolik má Josef let?");
    expect(result.options).toEqual(["58", "59", "60", "61"]);
  });
});

describe("parseIdList", () => {
  it("přijme seznam platných identifikátorů", () => {
    expect(parseIdList([UUID_A, UUID_B])).toEqual([UUID_A, UUID_B]);
  });

  it("odmítne prázdný seznam i jiný typ", () => {
    expect(() => parseIdList([])).toThrow(ApiError);
    expect(() => parseIdList("neco")).toThrow(ApiError);
    expect(() => parseIdList(null)).toThrow(ApiError);
  });

  it("odmítne neplatné i duplicitní položky", () => {
    expect(() => parseIdList([UUID_A, "nesmysl"])).toThrow(ApiError);
    expect(caught(() => parseIdList([UUID_A, UUID_A])).message).toContain(
      "duplicitní",
    );
  });
});
