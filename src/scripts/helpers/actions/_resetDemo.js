import { createSeedData } from "@/data/index.js";
import { store } from "../shared/index.js";

/**
 * Restores the demo to its seed state while keeping the user preferences.
 * @returns {void}
 */
export function resetDemo() {
  const { preferences } = store.snapshot();

  store.replace({
    ...createSeedData(),
    preferences: { ...preferences },
  });
}
