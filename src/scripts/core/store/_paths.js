// @ts-check
/**
 * @module core/store/_paths
 * Dot-path utilities used by {@link import('./_store.js').Store}.
 */

/**
 * Normalize a dot-path string or array into an array of keys.
 * @param {string | string[]} path
 * @returns {string[]}
 * @example
 * toPathArray('a.b.c')  // → ['a', 'b', 'c']
 * toPathArray(['a'])    // → ['a']
 */
export function toPathArray(path) {
  if (Array.isArray(path)) return path;
  if (path == null || path === "") return [];
  return String(path).split(".").filter(Boolean);
}

/**
 * Join a path into a dot-string.
 * @param {string | string[]} path
 * @returns {string}
 */
export function pathToString(path) {
  return toPathArray(path).join(".");
}
