// @ts-check
/**
 * @module core/store/_store
 * Proxy-based state container.
 *
 * Mutate `store.state` directly - Proxy traps fire `store:change` events and
 * notify per-store subscribers. Replace arrays/objects immutably
 * (`store.state.todos = [...]`) rather than pushing into existing arrays.
 *
 * The store never exposes raw proxies: `snapshot()` / `get(path)` return
 * cloned values, and writes are cloned on the way in.
 */

import { isObject } from "./_guards.js";
import { toPathArray } from "./_paths.js";
import { deepClone, clonePlainValue } from "./_clone.js";
import { makeDisposable } from "../disposable/index.js";

/** CustomEvent type dispatched by the store on every mutation. */
export const STORE_CHANGE_EVENT = "store:change";

/**
 * Keys that must never be read-through or written by the store - they could
 * reach `Object.prototype` and enable prototype pollution.
 * @type {Set<string>}
 */
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * True when `key` could touch the prototype chain.
 * @param {string | symbol} key
 * @returns {boolean}
 */
function isBlockedKey(key) {
  return typeof key === "string" && BLOCKED_KEYS.has(key);
}

/**
 * Change event detail.
 * @typedef {object} StoreChangeDetail
 * @property {string} path Dot-path of the mutation (`''` for `replace`).
 * @property {unknown} oldValue Previous value (cloned).
 * @property {unknown} newValue New value (cloned).
 */

/**
 * Lazily-resolved default event target. Uses the global object when it can
 * dispatch events (browser `window`, Node 20+ global), otherwise falls back
 * to a shared bare `EventTarget`.
 * @returns {EventTarget & { dispatchEvent(e: Event): boolean }}
 */
function defaultEventsTarget() {
  const g = /** @type {Record<string, unknown>} */ (globalThis);
  if (typeof g.dispatchEvent === "function" && typeof g.addEventListener === "function") {
    return /** @type {EventTarget & { dispatchEvent(e: Event): boolean }} */ (/** @type {unknown} */ (g));
  }
  return sharedTarget;
}

/** @type {EventTarget} Shared fallback target for non-global environments. */
const sharedTarget = new EventTarget();

/**
 * Proxy-based state container.
 *
 * @template S State shape (plain object).
 * @example
 * const store = new Store({ count: 0, todos: [] });
 * store.state.count += 1;            // fires store:change
 * store.subscribe(() => render());   // react to any mutation
 * store.snapshot();                  // { count: 1, todos: [] }
 */
export class Store {
  /**
   * @param {S} [initialState] Initial state (deep-cloned).
   * @param {{ eventsTarget?: EventTarget & { dispatchEvent(e: Event): boolean } }} [opts]
   *   `eventsTarget`: object that receives the `store:change` CustomEvent.
   *   Defaults to the global object (browser `window`, Node global).
   */
  constructor(initialState, opts = {}) {
    /** @type {EventTarget & { dispatchEvent(e: Event): boolean }} */
    this.events = opts.eventsTarget ?? defaultEventsTarget();
    /** @type {Record<string, unknown>} Raw (non-proxied) state tree. */
    this.target = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (deepClone(initialState ?? {})));
    /** @type {WeakMap<object, object>} Proxy cache per raw object. */
    this.proxyCache = new WeakMap();
    /** @type {Set<(detail: StoreChangeDetail) => void>} Per-store listeners. */
    this.listeners = new Set();
    /** @type {Record<string, unknown>} Reactive proxy surface. */
    this.state = /** @type {Record<string, unknown>} */ (this._createProxy(this.target, []));
  }

  /**
   * Wrap `target` in a change-emitting Proxy (cached per raw object).
   * @param {unknown} target
   * @param {string[]} path
   * @returns {unknown}
   * @private
   */
  _createProxy(target, path) {
    if (!isObject(target)) return target;
    if (this.proxyCache.has(target)) return this.proxyCache.get(target);
    const store = this;
    const proxy = new Proxy(target, {
      get(raw, key) {
        if (key === "__raw") return raw;
        if (key === "__path") return path;
        // Never proxy prototype-chain objects (prototype pollution guard).
        if (isBlockedKey(key)) return Reflect.get(raw, key);
        const value = Reflect.get(raw, key);
        if (isObject(value)) return store._createProxy(value, [...path, String(key)]);
        return value;
      },
      set(raw, key, value) {
        if (isBlockedKey(key)) {
          throw new TypeError(`Store: reserved key "${String(key)}" cannot be set`);
        }
        const nextPath = [...path, String(key)];
        const old = raw[/** @type {string} */ (key)];
        const prepared = clonePlainValue(value);
        const result = Reflect.set(raw, key, prepared);
        if (old !== prepared) store._emitChange(nextPath, old, prepared);
        return result;
      },
      deleteProperty(raw, key) {
        if (isBlockedKey(key)) {
          throw new TypeError(`Store: reserved key "${String(key)}" cannot be deleted`);
        }
        if (!(key in raw)) return true;
        const nextPath = [...path, String(key)];
        const old = raw[/** @type {string} */ (key)];
        const result = Reflect.deleteProperty(raw, key);
        store._emitChange(nextPath, old, undefined);
        return result;
      },
    });
    this.proxyCache.set(target, proxy);
    return proxy;
  }

  /**
   * Emit a change to per-store listeners and as a `store:change` CustomEvent.
   * @param {string[]} path
   * @param {unknown} oldValue
   * @param {unknown} newValue
   * @private
   */
  _emitChange(path, oldValue, newValue) {
    /** @type {StoreChangeDetail} */
    const detail = {
      path: toPathArray(path).join("."),
      oldValue: deepClone(oldValue),
      newValue: deepClone(newValue),
    };
    for (const listener of [...this.listeners]) listener(detail);
    this.events.dispatchEvent(new CustomEvent(STORE_CHANGE_EVENT, { detail }));
  }

  /**
   * Subscribe to every store mutation.
   * @param {(detail: StoreChangeDetail) => void} fn Listener receiving the
   *   change detail (`{ path, oldValue, newValue }`).
   * @returns {import('../disposable/_make-disposable.js').DisposableHandle & (() => void)}
   *   Unsubscribe - callable for back-compat and `[Symbol.dispose]`-ready on
   *   modern engines.
   */
  subscribe(fn) {
    this.listeners.add(fn);
    return makeDisposable(() => {
      this.listeners.delete(fn);
    });
  }

  /**
   * Read a value by dot-path. Nested objects are returned as proxies - clone
   * them (`store.snapshot()` / `deepClone`) before handing them out.
   * @param {string | string[]} path
   * @returns {unknown}
   */
  get(path) {
    const parts = toPathArray(path);
    /** @type {Record<string, unknown> | undefined} */
    let current = this.state;
    for (const part of parts) {
      current = /** @type {Record<string, unknown> | undefined} */ (current?.[part]);
    }
    return current;
  }

  /**
   * Write a value by dot-path (intermediate objects are created as needed).
   * @param {string | string[]} path
   * @param {unknown} value
   * @returns {unknown} The stored (cloned) value.
   */
  set(path, value) {
    const parts = toPathArray(path);
    if (parts.some(isBlockedKey)) {
      throw new TypeError(`Store: reserved key in path "${path}" cannot be written`);
    }
    const last = parts.pop();
    if (last === undefined) throw new Error("Store.set: path required");
    /** @type {Record<string, unknown>} */
    let current = this.state;
    for (const part of parts) {
      if (!isObject(current[part])) current[part] = {};
      current = /** @type {Record<string, unknown>} */ (current[part]);
    }
    current[last] = value;
    return value;
  }

  /**
   * Derive a new value from the current one at `path` and write it back.
   * @param {string | string[]} path
   * @param {(current: unknown) => unknown} fn
   * @returns {unknown} The stored value.
   * @example
   * store.update('todos', (todos) => [...todos, newTodo]);
   */
  update(path, fn) {
    const next = fn(this.get(path));
    this.set(path, next);
    return next;
  }

  /**
   * Replace the entire state tree. Emits a single `store:change` with
   * path `''`.
   * @param {S} next
   * @returns {void}
   */
  replace(next) {
    const old = deepClone(this.target);
    this.target = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (deepClone(next)));
    this.proxyCache = new WeakMap();
    this.state = /** @type {Record<string, unknown>} */ (this._createProxy(this.target, []));
    this._emitChange([], old, this.target);
  }

  /**
   * Deep-cloned snapshot of the current state.
   * @returns {S}
   */
  snapshot() {
    return /** @type {S} */ (deepClone(this.target));
  }
}
