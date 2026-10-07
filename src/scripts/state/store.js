/**
 * Application store: a single Proxy state tree persisted to localStorage.
 *
 * Every mutation fires a `store:change` event on the global object, which the
 * custom elements listen to in order to re-render their templates. The same
 * event feeds the debug log (unless the log is paused).
 */
import { Store } from "@/core/index.js";
import { createSeedData } from "@/data/index.js";
import { formatDebugTime } from "@/i18n/index.js";

const STORAGE_KEY = "custom-elements-and-beyond-demo-state-v1";
const MAX_DEBUG_LOG_ENTRIES = 30;

let isWritingDebugLog = false;

/**
 * Merge a persisted snapshot with the latest seed shape.
 * @param {unknown} savedState
 * @returns {import("@/data/_data.js").DemoState}
 */
function normalizeState(savedState) {
  const seed = createSeedData();

  if (typeof savedState !== "object" || savedState === null) {
    return seed;
  }

  return { ...seed, ...savedState, ui: seed.ui };
}

/**
 * Read the persisted state, falling back to the seed data.
 * @returns {import("@/data/_data.js").DemoState}
 */
function readInitialState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return createSeedData();
  }

  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return createSeedData();
  }
}

/** Shared application store. */
export const store = new Store(readInitialState());

/**
 * Prepend a store change to the debug log, capped to the latest entries.
 * @param {import("@/data/_data.js").DebugLogEntry} detail
 * @returns {void}
 */
function appendDebugLog(detail) {
  const nextLogs = [
    {
      id: crypto.randomUUID(),
      timestamp: formatDebugTime(store.state.preferences.language),
      ...detail,
    },
    ...store.state.debug.logs,
  ].slice(0, MAX_DEBUG_LOG_ENTRIES);

  store.state.debug.logs = nextLogs;
}

store.subscribe((detail) => {
  if (!isWritingDebugLog && !store.state.debug.paused && detail.path !== "debug.logs") {
    isWritingDebugLog = true;

    try {
      appendDebugLog(detail);
    } finally {
      isWritingDebugLog = false;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(store.snapshot()));
});

/**
 * Reset the store to fresh seed data.
 * @returns {void}
 */
export function resetStore() {
  store.replace(createSeedData());
}
