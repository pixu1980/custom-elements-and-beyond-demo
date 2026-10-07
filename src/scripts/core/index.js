/**
 * Public entry point for the demo runtime.
 *
 * The app is built on the Proxy Store and the `html` template engine. There is
 * no reactivity primitive: the store's `store:change` event drives every
 * re-render and the engine commits DOM parts.
 */
export { Store, STORE_CHANGE_EVENT } from "./store/index.js";
export { directive, html, isDirective, model, render, repeat } from "./template-engine/index.js";
