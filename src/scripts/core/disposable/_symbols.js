// @ts-check
/**
 * @module core/disposable/_symbols
 * Feature-detected well-known symbols for Explicit Resource Management
 * (ES2026). The symbols exist in Chrome 125+, Firefox 141+, Node 18.18+ and
 * Safari 26.4+ - but pix-galaxy targets Safari 17.5+, so the framework must
 * NOT use the `using`/`await using` syntax or assume the symbols exist.
 * Everything here degrades to plain `.dispose()` calls on older engines.
 */

/** @type {Record<string, unknown>} */
const SymbolRecord = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (Symbol));

/** `Symbol.dispose` when the engine defines it, else `undefined`. */
export const DISPOSE = typeof Symbol === "function" ? /** @type {symbol | undefined} */ (SymbolRecord.dispose) : undefined;

/** `Symbol.asyncDispose` when the engine defines it, else `undefined`. */
export const ASYNC_DISPOSE = typeof Symbol === "function" ? /** @type {symbol | undefined} */ (SymbolRecord.asyncDispose) : undefined;

/**
 * True when the engine supports the synchronous dispose protocol.
 * @type {boolean}
 */
export const HAS_DISPOSE = typeof DISPOSE === "symbol";

/**
 * True when the engine supports the async dispose protocol.
 * @type {boolean}
 */
export const HAS_ASYNC_DISPOSE = typeof ASYNC_DISPOSE === "symbol";

/**
 * Attach the engine's `Symbol.dispose` (when available) as an alias of the
 * class's existing `dispose` method. On engines without the symbol this is a
 * no-op and callers use `dispose()` directly.
 * @template T
 * @param {{ prototype: object }} cls Class whose `dispose` method to alias.
 * @returns {void}
 */
export function defineDisposable(cls) {
  if (!DISPOSE) return;
  const proto = /** @type {Record<PropertyKey, unknown>} */ (cls.prototype);
  // Alias only the class's OWN dispose - subclasses overriding dispose() get
  // their own alias instead of inheriting the parent's.
  if (Object.prototype.hasOwnProperty.call(proto, "dispose")) {
    Object.defineProperty(proto, DISPOSE, {
      configurable: true,
      value: proto.dispose,
      writable: true,
    });
  }
}

/**
 * Attach the engine's `Symbol.asyncDispose` (when available) as an alias of
 * the class's existing `asyncDispose`/`dispose` method.
 * @template T
 * @param {{ prototype: object }} cls Class to alias.
 * @param {string} [methodName] Method to alias (default `'dispose'`).
 * @returns {void}
 */
export function defineAsyncDisposable(cls, methodName = "dispose") {
  if (!ASYNC_DISPOSE) return;
  const proto = /** @type {Record<PropertyKey, unknown>} */ (cls.prototype);
  if (typeof proto[ASYNC_DISPOSE] !== "function") {
    Object.defineProperty(cls.prototype, ASYNC_DISPOSE, {
      configurable: true,
      value: proto[methodName],
      writable: true,
    });
  }
}
