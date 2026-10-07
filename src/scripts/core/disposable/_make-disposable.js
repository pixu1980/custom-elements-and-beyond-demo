// @ts-check
/**
 * @module core/disposable/_make-disposable
 * Turn a plain cleanup callback into an object that is disposable under both
 * protocols: the framework's own `.dispose()` and the engine's
 * `[Symbol.dispose]` when it exists.
 */

import { DISPOSE } from "./_symbols.js";

/**
 * A cleanup handle: callable-friendly object with `.dispose()` and, on modern
 * engines, `[Symbol.dispose]()`.
 * @typedef {object} DisposableHandle
 * @property {() => void} dispose
 * @property {() => void} [Symbol.dispose]
 */

/**
 * Wrap a cleanup callback as a disposable handle.
 *
 * @param {() => void} dispose Cleanup to run once.
 * @returns {DisposableHandle & (() => void)} A callable handle (`handle()`
 *   also disposes) so existing `dispose()` call sites keep working.
 * @example
 * const handle = makeDisposable(() => clearInterval(timer));
 * handle.dispose();
 * handle();               // also works (back-compat)
 */
export function makeDisposable(dispose) {
  /** @type {DisposableHandle & (() => void)} */
  const handle = () => dispose();
  handle.dispose = dispose;
  if (DISPOSE) {
    Object.defineProperty(handle, DISPOSE, {
      configurable: true,
      value: dispose,
      writable: true,
    });
  }
  return handle;
}
