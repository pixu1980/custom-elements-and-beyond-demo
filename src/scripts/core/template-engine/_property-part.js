// @ts-check
/**
 * @module core/template-engine/_property-part
 * DOM property part for `.prop=${value}` attributes.
 */

import { Part } from "./_part.js";

/**
 * Writes values to a DOM property (e.g. `.value`, `.disabled`).
 */
export class PropertyPart extends Part {
  /**
   * @param {Element} element
   * @param {string} name Property name without the `.` prefix.
   */
  constructor(element, name) {
    super();
    this.element = element;
    this.name = name;
  }

  /**
   * @param {unknown} value
   */
  setValue(value) {
    this.commit(value);
  }

  /**
   * @param {unknown} value
   */
  commit(value) {
    const record = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (this.element));
    record[this.name] = value;
  }
}
