// @ts-check
/**
 * Root render function: mounts a template result into a container and
 * re-renders incrementally on subsequent calls.
 */

import { ChildNodePart } from "./_child-node-part.js";
import { clearRange } from "./_range.js";
import { makeDisposable } from "../disposable/index.js";

/**
 * Container augmented with the cached root part.
 * @typedef {Element & { __rootPart?: ChildNodePart }} RootContainer
 */

/**
 * Render a template result (from {@link html}) into `container`.
 *
 * The first call installs a root ChildNodePart; later calls with a result
 * built from the same static strings update the existing DOM in place.
 *
 * @param {import('./_template-helpers.js').TemplateResult | null} result
 *   Template result (attach `result._context = ctx` to enable `{{ }}`
 *   expression resolution), or `null` to unmount the current view.
 * @param {RootContainer} container Target element.
 * @example
 * const view = html`<h1>{{ title }}</h1>`;
 * view._context = { title: 'Hello' };
 * render(view, document.querySelector('#app'));
 */
export function render(result, container) {
  /** @type {ChildNodePart | undefined} */
  let rootPart = container.__rootPart;

  // Unmount: release subscriptions, remove content and the root markers.
  if (result == null) {
    if (rootPart) {
      rootPart.dispose();
      clearRange(rootPart.start, rootPart.end);
      rootPart.start.remove();
      rootPart.end.remove();
      container.__rootPart = undefined;
    }
    return;
  }

  if (!rootPart) {
    const start = document.createComment("root:start");
    const end = document.createComment("root:end");
    container.textContent = "";
    container.append(start, end);
    rootPart = new ChildNodePart(start, end);
    container.__rootPart = rootPart;
  }
  rootPart.setValue(result);

  // Return a disposer for the mounted view: calling it unmounts the view.
  return makeDisposable(() => {
    render(null, container);
  });
}
