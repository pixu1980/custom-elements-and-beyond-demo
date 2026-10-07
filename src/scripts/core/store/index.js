// @ts-check
/**
 * @module core/store/index
 * Store exports.
 */

export { Store, STORE_CHANGE_EVENT } from "./_store.js";
export { deepClone, clonePlainValue } from "./_clone.js";
export { isObject } from "./_guards.js";
export { toPathArray, pathToString } from "./_paths.js";
