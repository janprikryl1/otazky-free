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
    // storage blocked: the game still works, just without recovery
  }
}

function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

/** Restores the player after a reload or the phone waking up. */
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
  } catch {}

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

export function loadLastGamePin(): string | null {
  const pin = safeRead(LAST_GAME_KEY);
  return pin && /^[0-9]{6}$/.test(pin) ? pin : null;
}

/**
 * Only forget the player when the response actually came from a request
 * carrying their id. Right after joining, an older response fetched without
 * playerId is still on screen and its `me: null` means nothing.
 */
export function shouldForgetPlayer(params: {
  hasStoredPlayer: boolean;
  isMissingFromSession: boolean;
  /** URL the displayed data came from. */
  loadedUrl: string | null;
  /** URL we would request now, carrying playerId. */
  currentUrl: string | null;
}): boolean {
  const { hasStoredPlayer, isMissingFromSession, loadedUrl, currentUrl } =
    params;

  if (!hasStoredPlayer || !isMissingFromSession) return false;
  if (loadedUrl === null || currentUrl === null) return false;

  return loadedUrl === currentUrl;
}
