import { componentDecorator } from "@/lib/component-decorator.js";

/**
 * Customized built-in button: a native `<button>` extended with declarative
 * actions. A `data-action` value is forwarded as a bubbling `ceb:action`
 * event, so containers can react with a single delegated listener.
 *
 * @example
 * <button is="ceb-button" data-action="reset">Reset</button>
 */
export class CebButton extends HTMLButtonElement {
  static name = "ceb-button";
  static extends = "button";

  static events = {
    click: function () {
      const action = this.dataset.action;

      if (!action) {
        return;
      }

      this.dispatchEvent(
        new CustomEvent("ceb:action", {
          bubbles: true,
          detail: { action },
        })
      );
    },
  };

  static {
    componentDecorator("Button", CebButton);
  }

  /** Native buttons need an explicit default type. */
  onConnect() {
    this.type = this.getAttribute("type") || "button";
  }
}
