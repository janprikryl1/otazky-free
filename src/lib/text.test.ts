import { describe, expect, it } from "vitest";

import { charLength, isUuid, sanitizeText, truncate } from "@/lib/text";

describe("sanitizeText", () => {
  it("ořízne okraje a sjednotí mezery", () => {
    expect(sanitizeText("  Josef   Přikryl  ")).toBe("Josef Přikryl");
  });

  it("změní konce řádků a tabulátory v jednu mezeru", () => {
    expect(sanitizeText("první\n\nřádek\tdruhý")).toBe("první řádek druhý");
  });

  it("zahodí nezlomitelné a exotické mezery", () => {
    expect(sanitizeText("Josef  Novák")).toBe("Josef Novák");
  });

  it("zahodí řídicí znaky, aniž by slepil slova", () => {
    expect(sanitizeText("Josef \u0001 Novák")).toBe("Josef Novák");
    expect(sanitizeText("Jo\u0007sef")).toBe("Josef");
  });

  it("zahodí neviditelné znaky, kterými by šlo obejít prázdnou přezdívku", () => {
    expect(sanitizeText("​​")).toBe("");
    expect(sanitizeText("﻿")).toBe("");
  });

  it("zahodí přepínače směru textu", () => {
    expect(sanitizeText("Josef‮fesoJ")).toBe("JoseffesoJ");
  });

  it("sjednotí diakritiku do NFC", () => {
    // "Prikryl" s kombinujícím háčkem zapsaný rozloženě
    const decomposed = "Přikryl";
    expect(sanitizeText(decomposed)).toBe("Přikryl".normalize("NFC"));
  });

  it("vrátí prázdný řetězec pro jiné typy než text", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(42)).toBe("");
    expect(sanitizeText({ nickname: "Josef" })).toBe("");
    expect(sanitizeText(undefined)).toBe("");
  });
});

describe("charLength", () => {
  it("počítá emodži jako jeden znak", () => {
    expect(charLength("🎉")).toBe(1);
    expect("🎉".length).toBe(2); // pro srovnání: UTF-16 jednotky
    expect(charLength("ěščřž")).toBe(5);
  });
});

describe("truncate", () => {
  it("nechá kratší text beze změny", () => {
    expect(truncate("Josef", 10)).toBe("Josef");
  });

  it("ořízne na počet znaků, ne bajtů", () => {
    expect(truncate("🎉🎉🎉", 2)).toBe("🎉🎉");
  });
});

describe("isUuid", () => {
  it("přijme platné UUID verze 4", () => {
    expect(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(true);
    expect(isUuid("3F2504E0-4F89-41D3-9A0C-0305E82C3301")).toBe(true);
  });

  it("odmítne nesmysly a pokusy o vložení SQL", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("abc")).toBe(false);
    expect(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c330")).toBe(false);
    expect(isUuid("' OR 1=1 --")).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(123)).toBe(false);
  });
});
