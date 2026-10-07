// @ts-check
/**
 * @module core/disposable/index
 * Disposable primitives: Explicit Resource Management support that works on
 * every supported engine (feature-detected `Symbol.dispose`).
 */

export { DISPOSE, ASYNC_DISPOSE, HAS_DISPOSE, HAS_ASYNC_DISPOSE, defineDisposable, defineAsyncDisposable } from "./_symbols.js";
export { makeDisposable } from "./_make-disposable.js";
export { DisposableStack, AsyncDisposableStack } from "./_disposable-stack.js";
