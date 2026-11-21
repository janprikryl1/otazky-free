import { describe, expect, it } from "vitest";

import { shouldForgetPlayer } from "@/lib/player-storage";

const WITHOUT_ID = "/api/game/state?pin=217018";
const WITH_ID = "/api/game/state?pin=217018&playerId=ac2c6e0c-a37a";

describe("shouldForgetPlayer", () => {
  it("zapomene hráče, když ho server v relaci opravdu nenašel", () => {
    expect(
      shouldForgetPlayer({
        hasStoredPlayer: true,
        isMissingFromSession: true,
        loadedUrl: WITH_ID,
        currentUrl: WITH_ID,
      }),
    ).toBe(true);
  });

  it("nezapomene hráče hned po připojení, kdy ještě visí starší odpověď", () => {
    // Odpověď se načetla ještě před připojením, tedy bez playerId –
    // `me: null` v ní neznamená, že hráč ve hře není.
    expect(
      shouldForgetPlayer({
        hasStoredPlayer: true,
        isMissingFromSession: true,
        loadedUrl: WITHOUT_ID,
        currentUrl: WITH_ID,
      }),
    ).toBe(false);
  });

  it("nezapomene hráče, dokud nedorazila žádná data", () => {
    expect(
      shouldForgetPlayer({
        hasStoredPlayer: true,
        isMissingFromSession: true,
        loadedUrl: null,
        currentUrl: WITH_ID,
      }),
    ).toBe(false);
  });

  it("nic neřeší, když server hráče našel", () => {
    expect(
      shouldForgetPlayer({
        hasStoredPlayer: true,
        isMissingFromSession: false,
        loadedUrl: WITH_ID,
        currentUrl: WITH_ID,
      }),
    ).toBe(false);
  });

  it("nic neřeší, když žádný hráč uložený není", () => {
    expect(
      shouldForgetPlayer({
        hasStoredPlayer: false,
        isMissingFromSession: true,
        loadedUrl: WITHOUT_ID,
        currentUrl: WITHOUT_ID,
      }),
    ).toBe(false);
  });

  it("nezapomene hráče při přepnutí do jiné hry, než na kterou se ptáme", () => {
    expect(
      shouldForgetPlayer({
        hasStoredPlayer: true,
        isMissingFromSession: true,
        loadedUrl: "/api/game/state?pin=111111&playerId=ac2c6e0c-a37a",
        currentUrl: WITH_ID,
      }),
    ).toBe(false);
  });
});
