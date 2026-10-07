// @ts-check
/**
 * @module core/template-engine/_part
 * Base class for parts.
 *
 * Parts commit values straight to the DOM. This build has no reactivity
 * primitive: the Proxy store drives every re-render.
 */

import { defineDisposable } from "../disposable/index.js";

/**
 * Base part: holds the last committed value and defines the dispose contract.
 */
export class Part {
  constructor() {
    /** @type {unknown} Last committed value. */
    this.value = undefined;
  }

  /**
   * Commit a value. Subclasses override.
   * @param {unknown} _value Value to commit.
   */
  setValue(_value) {
    // Base implementation is a no-op; concrete parts override.
  }

  /**
   * Release every subscription held by the part. Subclasses extend.
   */
  dispose() {}
}

defineDisposable(Part);
