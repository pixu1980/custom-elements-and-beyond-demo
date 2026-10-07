// @ts-check
/**
 * @module core/template-engine/_event-part
 * Event listener part for `@event=${fn}` attributes.
 */

import { defineDisposable } from "../disposable/index.js";

/**
 * Binds a function to a named event on an element. Replacing the value
 * removes the previous listener.
 */
export class EventPart {
  /**
   * @param {Element} element
   * @param {string} name Event name without the `@` prefix.
   */
  constructor(element, name) {
    this.element = element;
    this.name = name;
    /** @type {((event: Event) => void) | null} Active listener. */
    this.listener = null;
  }

  /**
   * @param {unknown} value Listener function (other values unbind).
   */
  setValue(value) {
    if (this.listener) {
      this.element.removeEventListener(this.name, this.listener);
      this.listener = null;
    }
    if (typeof value !== "function") return;
    this.listener = /** @type {(event: Event) => void} */ (value);
    this.element.addEventListener(this.name, this.listener);
  }

  /** Remove the active listener, if any. */
  dispose() {
    if (this.listener) {
      this.element.removeEventListener(this.name, this.listener);
      this.listener = null;
    }
  }
}

defineDisposable(EventPart);
