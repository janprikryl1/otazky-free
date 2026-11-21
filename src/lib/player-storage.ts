export type StoredPlayer = {
  playerId: string;
  sessionId: string;
  pin: string;
  nickname: string;
};

const PREFIX = "kviz:hrac:";
const LAST_GAME_KEY = "kviz:posledni-hra";

function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* privátní režim nebo zakázané úložiště – hra funguje i bez obnovy */
  }
}

function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nic */
  }
}

/** Načte hráče uloženého pro daný PIN (obnova po F5 / uspání telefonu). */
export function loadStoredPlayer(pin: string): StoredPlayer | null {
  const raw = safeRead(PREFIX + pin);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredPlayer>;

    if (
      typeof parsed.playerId === "string" &&
      typeof parsed.sessionId === "string" &&
      typeof parsed.nickname === "string"
    ) {
      return {
        playerId: parsed.playerId,
        sessionId: parsed.sessionId,
        pin,
        nickname: parsed.nickname,
      };
    }
  } catch {
    /* poškozený záznam zahodíme */
  }

  safeRemove(PREFIX + pin);
  return null;
}

export function storePlayer(player: StoredPlayer) {
  safeWrite(PREFIX + player.pin, JSON.stringify(player));
  safeWrite(LAST_GAME_KEY, player.pin);
}

export function clearStoredPlayer(pin: string) {
  safeRemove(PREFIX + pin);

  if (safeRead(LAST_GAME_KEY) === pin) {
    safeRemove(LAST_GAME_KEY);
  }
}

/** PIN poslední hry, do které se hráč na tomto zařízení přihlásil. */
export function loadLastGamePin(): string | null {
  const pin = safeRead(LAST_GAME_KEY);
  return pin && /^[0-9]{6}$/.test(pin) ? pin : null;
}
