// @ts-check
/**
 * @module core/disposable/_disposable-stack
 * Framework-owned DisposableStack / AsyncDisposableStack.
 *
 * Mirrors the ES2026 Explicit Resource Management stacks (`use`, `adopt`,
 * `defer`, `move`, `dispose`) but works on every supported engine - no
 * dependency on the native `using` declaration or `Symbol.dispose`.
 *
 * Disposal runs in **reverse registration order** and, like `SuppressedError`,
 * a first disposal failure is re-thrown with the remaining failures attached
 * as `.suppressed`.
 */

import { ASYNC_DISPOSE, DISPOSE, HAS_ASYNC_DISPOSE, HAS_DISPOSE } from "./_symbols.js";

/**
 * Anything with a synchronous `dispose` method.
 * @typedef {object} SyncDisposable
 * @property {() => void} dispose
 */

/**
 * Anything with an asynchronous `dispose` method.
 * @typedef {object} AsyncDisposable
 * @property {() => void | Promise<void>} dispose
 */

/**
 * A synchronous resource stack. Registered resources are disposed in reverse
 * order when the stack is disposed (directly, or via `[Symbol.dispose]`).
 *
 * @example
 * const stack = new DisposableStack();
 * const timers = [];
 * stack.defer(() => timers.forEach(clearInterval));
 * stack.use(someDisposable);
 * // ... on exit:
 * stack.dispose();
 */
export class DisposableStack {
  constructor() {
    /** @type {Array<SyncDisposable | { dispose?: () => void }>} */
    this._resources = [];
    /** @type {boolean} */
    this._disposed = false;
  }

  /**
   * True once the stack has been disposed (directly or via move()).
   * @returns {boolean}
   */
  get disposed() {
    return this._disposed;
  }

  /**
   * Register a resource that is itself disposable.
   * @template T
   * @param {T | null | undefined} resource
   * @returns {T | null | undefined}
   */
  use(resource) {
    this._assertNotDisposed();
    if (resource != null) {
      this._resources.push(/** @type {SyncDisposable} */ (/** @type {unknown} */ (resource)));
    }
    return resource;
  }

  /**
   * Register a value plus a cleanup callback for it.
   * @template T
   * @param {T} value
   * @param {(value: T) => void} onDispose
   * @returns {T}
   */
  adopt(value, onDispose) {
    this._assertNotDisposed();
    this._resources.push({ dispose: () => onDispose(value) });
    return value;
  }

  /**
   * Register an arbitrary cleanup action (e.g. `clearInterval`).
   * @param {() => void} onDispose
   */
  defer(onDispose) {
    this._assertNotDisposed();
    this._resources.push({ dispose: onDispose });
  }

  /**
   * Dispose every registered resource, in reverse registration order.
   * Disposal errors are aggregated: the first failure is thrown with the rest
   * attached as `.suppressed` (SuppressedError-compatible shape).
   */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    const errors = [];
    for (let i = this._resources.length - 1; i >= 0; i--) {
      const resource = this._resources[i];
      try {
        resource.dispose?.();
      } catch (error) {
        errors.push(error);
      }
    }
    this._resources.length = 0;
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      const first = /** @type {Error & { suppressed?: unknown[] }} */ (errors[0]);
      first.suppressed = errors.slice(1);
      throw first;
    }
  }

  /**
   * Transfer ownership of every registered resource into a fresh stack and
   * mark this stack disposed without running any cleanup. Use it to hand
   * half-built resource groups out safely.
   * @returns {DisposableStack}
   */
  move() {
    this._assertNotDisposed();
    const moved = new DisposableStack();
    moved._resources = this._resources;
    this._resources = [];
    this._disposed = true;
    return moved;
  }

  /**
   * @private
   */
  _assertNotDisposed() {
    if (this._disposed) {
      throw new Error("DisposableStack: resource stack already disposed");
    }
  }
}

if (DISPOSE) {
  Object.defineProperty(DisposableStack.prototype, DISPOSE, {
    configurable: true,
    value: DisposableStack.prototype.dispose,
    writable: true,
  });
}

/**
 * An asynchronous resource stack. Disposal awaits each registered
 * `dispose`/`asyncDispose` in reverse order.
 *
 * @example
 * const stack = new AsyncDisposableStack();
 * stack.use(fileHandle);            // Node FileHandle has Symbol.asyncDispose
 * stack.defer(async () => flush());
 * await stack.dispose();
 */
export class AsyncDisposableStack {
  constructor() {
    /** @type {Array<AsyncDisposable | { dispose?: () => void | Promise<void> }>} */
    this._resources = [];
    /** @type {boolean} */
    this._disposed = false;
  }

  /**
   * True once the stack has been disposed.
   * @returns {boolean}
   */
  get disposed() {
    return this._disposed;
  }

  /**
   * Register a resource with a `dispose` method (sync or async).
   * @template T
   * @param {T | null | undefined} resource
   * @returns {T | null | undefined}
   */
  use(resource) {
    this._assertNotDisposed();
    if (resource != null) {
      this._resources.push(/** @type {AsyncDisposable} */ (/** @type {unknown} */ (resource)));
    }
    return resource;
  }

  /**
   * Register a value plus an (optionally async) cleanup callback.
   * @template T
   * @param {T} value
   * @param {(value: T) => void | Promise<void>} onDispose
   * @returns {T}
   */
  adopt(value, onDispose) {
    this._assertNotDisposed();
    this._resources.push({ dispose: () => onDispose(value) });
    return value;
  }

  /**
   * Register an arbitrary cleanup action, sync or async.
   * @param {() => void | Promise<void>} onDispose
   */
  defer(onDispose) {
    this._assertNotDisposed();
    this._resources.push({ dispose: onDispose });
  }

  /**
   * Dispose every resource in reverse order, awaiting each cleanup.
   * @returns {Promise<void>}
   */
  async dispose() {
    if (this._disposed) return;
    this._disposed = true;
    const errors = [];
    for (let i = this._resources.length - 1; i >= 0; i--) {
      const resource = this._resources[i];
      try {
        await resource.dispose?.();
      } catch (error) {
        errors.push(error);
      }
    }
    this._resources.length = 0;
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      const first = /** @type {Error & { suppressed?: unknown[] }} */ (errors[0]);
      first.suppressed = errors.slice(1);
      throw first;
    }
  }

  /**
   * Transfer ownership of every registered resource into a fresh stack.
   * @returns {AsyncDisposableStack}
   */
  move() {
    this._assertNotDisposed();
    const moved = new AsyncDisposableStack();
    moved._resources = this._resources;
    this._resources = [];
    this._disposed = true;
    return moved;
  }

  /**
   * @private
   */
  _assertNotDisposed() {
    if (this._disposed) {
      throw new Error("AsyncDisposableStack: resource stack already disposed");
    }
  }
}

if (ASYNC_DISPOSE) {
  Object.defineProperty(AsyncDisposableStack.prototype, ASYNC_DISPOSE, {
    configurable: true,
    value: AsyncDisposableStack.prototype.dispose,
    writable: true,
  });
}
