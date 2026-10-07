/**
 * Mirrors persisted preferences onto the document element.
 *
 * The theme, color-scheme and radius tokens are scoped to
 * `:root[data-theme="…"]` and `:root[data-color-scheme="…"]`, so the store
 * preferences must be written to `document.documentElement` for CSS to react.
 * Without this bridge, switching the theme in the header changes the store but
 * no token is re-resolved.
 */
import { store } from "./store.js";

/**
 * Apply the current store preferences to the document element.
 * @returns {void}
 */
export function syncDocumentPreferences() {
  const { colorScheme, theme, language } = store.snapshot().preferences;
  const root = document.documentElement;

  root.dataset.colorScheme = colorScheme;
  root.dataset.theme = theme;
  root.dataset.language = language;
  root.lang = language;
}

/**
 * Apply the preferences once and keep them in sync with every store change.
 * @returns {void}
 */
export function watchDocumentPreferences() {
  syncDocumentPreferences();
  window.addEventListener("store:change", syncDocumentPreferences);
}
