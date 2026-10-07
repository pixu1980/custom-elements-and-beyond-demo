// @ts-check
/**
 * @module core/store/_guards
 * Type guards for the store internals.
 */

/**
 * True for any non-null object (including arrays, Date, Map, Set).
 * @param {unknown} value
 * @returns {value is Record<string, unknown> & object}
 */
export function isObject(value) {
  return value !== null && typeof value === "object";
}
