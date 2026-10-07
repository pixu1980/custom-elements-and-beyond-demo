// @ts-check
/**
 * @module core/store/_clone
 * Deep-clone utilities. Handles Date, RegExp, Map, Set, arrays, plain
 * objects, and store proxies (via the `__raw` escape hatch).
 */

import { isObject } from "./_guards.js";

/**
 * Deep-clone a plain value, preserving special types and breaking proxy
 * references through the `__raw` property.
 *
 * @template T
 * @param {T} value Value to clone.
 * @param {WeakMap<object, unknown>} [seen] Cycle guard (internal).
 * @returns {T}
 */
export function clonePlainValue(value, seen = new WeakMap()) {
  const raw = isObject(value) ? (value.__raw ?? value) : value;
  if (!isObject(raw)) return /** @type {T} */ (raw);
  if (seen.has(raw)) return /** @type {T} */ (seen.get(raw));

  if (raw instanceof Date) return /** @type {T} */ (new Date(raw.getTime()));
  if (raw instanceof RegExp) return /** @type {T} */ (new RegExp(raw.source, raw.flags));
  if (raw instanceof Map) {
    const next = new Map();
    seen.set(raw, next);
    for (const [k, v] of raw) next.set(clonePlainValue(k, seen), clonePlainValue(v, seen));
    return /** @type {T} */ (next);
  }
  if (raw instanceof Set) {
    const next = new Set();
    seen.set(raw, next);
    for (const v of raw) next.add(clonePlainValue(v, seen));
    return /** @type {T} */ (next);
  }
  if (Array.isArray(raw)) {
    /** @type {unknown[]} */
    const next = [];
    seen.set(raw, next);
    for (const v of raw) next.push(clonePlainValue(v, seen));
    return /** @type {T} */ (next);
  }

  const next = /** @type {Record<string, unknown>} */ ({});
  seen.set(raw, next);
  for (const key of Reflect.ownKeys(raw)) {
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor?.enumerable) continue;
    next[/** @type {string} */ (key)] = clonePlainValue(raw[/** @type {string} */ (key)], seen);
  }
  return /** @type {T} */ (next);
}

/**
 * Convenience wrapper around {@link clonePlainValue}.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function deepClone(value) {
  return clonePlainValue(value);
}
