import "./_App.css";

import { html } from "@/core/index.js";
import { openCategoryModal, openTodoModal, resetDemo } from "@/helpers/actions/index.js";
import { componentDecorator } from "@/lib/component-decorator.js";

/** Map of declarative `data-action` values to store actions. */
const ACTIONS = {
  reset: resetDemo,
  "new-todo": openTodoModal,
  "new-category": openCategoryModal,
};

/**
 * Application shell. Containers are autonomous custom elements, interactive
 * controls are customized built-ins.
 */
export class CebApp extends HTMLElement {
  static name = "ceb-app";
  static live = false;

  static events = {
    "ceb:action": function (event) {
      const handler = ACTIONS[event.detail.action];

      handler?.();
    },
  };

  static {
    componentDecorator("App", CebApp);
  }

  /** Mount the static shell once and mirror the workspace height. */
  onConnect() {
    this.dataset.appRoot = "true";
    this.update();
    this.observeShell();
  }

  /** Stop observing the workspace. */
  onDisconnect() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  /** Mirror the workspace height onto `--app-main-block-size`. */
  observeShell() {
    const shell = this.querySelector('[data-component="app-shell"]');

    if (!shell) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.style.setProperty("--app-main-block-size", `${Math.ceil(shell.getBoundingClientRect().height)}px`);
    });
    this.resizeObserver.observe(shell);
  }

  /**
   * @returns {ReturnType<typeof html>}
   */
  render() {
    return html`
      <ceb-header></ceb-header>
      <main data-component="app-shell">
        <ceb-stats-row></ceb-stats-row>
        <ceb-todo-list></ceb-todo-list>
      </main>
      <aside data-slot="controls">
        <ceb-filters></ceb-filters>
        <ceb-bulk-actions></ceb-bulk-actions>
      </aside>
      <aside data-slot="debug-sidebar">
        <ceb-debug-panel></ceb-debug-panel>
      </aside>
    `;
  }
}
