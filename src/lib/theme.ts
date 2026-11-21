export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "kviz:motiv";
export const DEFAULT_THEME: Theme = "dark";

/**
 * Skript, který běží dřív, než se stránka vykreslí.
 *
 * Bez něj by při každém načtení na okamžik probliknul tmavý motiv,
 * i když má moderátor zvolený světlý. Je schválně malý a bez závislostí.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark"){t=${JSON.stringify(
  DEFAULT_THEME,
)};}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme=${JSON.stringify(
  DEFAULT_THEME,
)};}})();`;

/** Přečte motiv nastavený skriptem výše (v prohlížeči). */
export function readTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Přepne motiv a zapamatuje si volbu pro příště. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* privátní režim – motiv vydrží aspoň do zavření stránky */
  }
}
