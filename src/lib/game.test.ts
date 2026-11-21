import { describe, expect, it } from "vitest";

import {
  BASE_POINTS,
  buildLeaderboard,
  calculatePoints,
  countVotes,
  generatePin,
  isValidPin,
  MAX_SPEED_BONUS,
  normalizeNickname,
} from "@/lib/game";
import type { PlayerRow } from "@/lib/types";

function player(
  id: string,
  nickname: string,
  score: number,
  joinedAt: string,
): Pick<PlayerRow, "id" | "nickname" | "score" | "joined_at"> {
  return { id, nickname, score, joined_at: joinedAt };
}

describe("calculatePoints", () => {
  it("dá maximum za okamžitou odpověď", () => {
    expect(calculatePoints({ timeLimitSeconds: 20, elapsedMs: 0 })).toBe(
      BASE_POINTS + MAX_SPEED_BONUS,
    );
  });

  it("dá jen základ, když hráč odpoví na poslední chvíli", () => {
    expect(calculatePoints({ timeLimitSeconds: 20, elapsedMs: 20_000 })).toBe(
      BASE_POINTS,
    );
  });

  it("dá v polovině času polovinu bonusu", () => {
    expect(calculatePoints({ timeLimitSeconds: 20, elapsedMs: 10_000 })).toBe(
      BASE_POINTS + MAX_SPEED_BONUS / 2,
    );
  });

  it("nikdy nepřekročí maximum ani neklesne pod základ", () => {
    // záporný uplynulý čas (rozcházející se hodiny) ani přetečení limitu
    // nesmí rozbít bodování
    expect(calculatePoints({ timeLimitSeconds: 20, elapsedMs: -5000 })).toBe(
      BASE_POINTS + MAX_SPEED_BONUS,
    );
    expect(calculatePoints({ timeLimitSeconds: 20, elapsedMs: 999_999 })).toBe(
      BASE_POINTS,
    );
  });

  it("zvládne i nulový limit, aniž by vrátil NaN", () => {
    const points = calculatePoints({ timeLimitSeconds: 0, elapsedMs: 0 });
    expect(Number.isFinite(points)).toBe(true);
    expect(points).toBeGreaterThanOrEqual(BASE_POINTS);
  });
});

describe("buildLeaderboard", () => {
  it("řadí podle bodů sestupně", () => {
    const board = buildLeaderboard([
      player("a", "Anna", 300, "2026-01-01T10:00:00Z"),
      player("b", "Bob", 900, "2026-01-01T10:00:01Z"),
      player("c", "Cyril", 600, "2026-01-01T10:00:02Z"),
    ]);

    expect(board.map((row) => row.nickname)).toEqual(["Bob", "Cyril", "Anna"]);
    expect(board.map((row) => row.rank)).toEqual([1, 2, 3]);
  });

  it("při rovnosti bodů dá přednost dřívějšímu příchodu", () => {
    const board = buildLeaderboard([
      player("pozdni", "Pozdní", 500, "2026-01-01T10:05:00Z"),
      player("rychly", "Rychlý", 500, "2026-01-01T10:00:00Z"),
    ]);

    expect(board[0].nickname).toBe("Rychlý");
  });

  it("dá stejnému počtu bodů stejné pořadí a další místo přeskočí", () => {
    const board = buildLeaderboard([
      player("a", "Anna", 900, "2026-01-01T10:00:00Z"),
      player("b", "Bob", 500, "2026-01-01T10:00:01Z"),
      player("c", "Cyril", 500, "2026-01-01T10:00:02Z"),
      player("d", "Dana", 100, "2026-01-01T10:00:03Z"),
    ]);

    expect(board.map((row) => row.rank)).toEqual([1, 2, 2, 4]);
  });

  it("doplní body získané za poslední otázku", () => {
    const board = buildLeaderboard(
      [player("a", "Anna", 900, "2026-01-01T10:00:00Z")],
      new Map([["a", 750]]),
    );

    expect(board[0].lastPoints).toBe(750);
  });

  it("zvládne prázdný seznam hráčů", () => {
    expect(buildLeaderboard([])).toEqual([]);
  });
});

describe("countVotes", () => {
  it("spočítá hlasy pro každou možnost", () => {
    const counts = countVotes(
      [
        { option_index: 0 },
        { option_index: 2 },
        { option_index: 0 },
        { option_index: 3 },
      ],
      4,
    );

    expect(counts).toEqual([2, 0, 1, 1]);
  });

  it("ignoruje indexy mimo rozsah", () => {
    expect(countVotes([{ option_index: 9 }, { option_index: -1 }], 2)).toEqual([
      0, 0,
    ]);
  });

  it("vrátí samé nuly, když nikdo neodpověděl", () => {
    expect(countVotes([], 3)).toEqual([0, 0, 0]);
  });
});

describe("normalizeNickname", () => {
  it("přijme běžnou přezdívku a očistí ji", () => {
    expect(normalizeNickname("  Verunka  ")).toBe("Verunka");
    expect(normalizeNickname("Josef   Přikryl")).toBe("Josef Přikryl");
  });

  it("odmítne prázdnou přezdívku i tu z neviditelných znaků", () => {
    expect(normalizeNickname("")).toBeNull();
    expect(normalizeNickname("   ")).toBeNull();
    expect(normalizeNickname("​​​")).toBeNull();
    expect(normalizeNickname("\n\t")).toBeNull();
  });

  it("odmítne jiné typy než text", () => {
    expect(normalizeNickname(null)).toBeNull();
    expect(normalizeNickname(42)).toBeNull();
    expect(normalizeNickname(["Josef"])).toBeNull();
  });

  it("hlídá délku ve znacích, ne v UTF-16 jednotkách", () => {
    expect(normalizeNickname("a".repeat(24))).toBe("a".repeat(24));
    expect(normalizeNickname("a".repeat(25))).toBeNull();
    // 20 emodži = 40 UTF-16 jednotek, ale jen 20 znaků → projde
    expect(normalizeNickname("🎉".repeat(20))).toBe("🎉".repeat(20));
    expect(normalizeNickname("🎉".repeat(25))).toBeNull();
  });
});

describe("PIN hry", () => {
  it("generuje vždy šest číslic", () => {
    for (let i = 0; i < 300; i += 1) {
      expect(generatePin()).toMatch(/^[0-9]{6}$/);
    }
  });

  it("uznává jen šestimístné číselné PINy", () => {
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("000000")).toBe(true);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("12345a")).toBe(false);
    expect(isValidPin(" 123456 ")).toBe(false);
    expect(isValidPin(123456)).toBe(false);
    expect(isValidPin(null)).toBe(false);
  });
});
