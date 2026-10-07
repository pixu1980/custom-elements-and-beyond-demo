/**
 * Metadata-driven component decorator.
 *
 * A component declares its static metadata and calls the decorator from a
 * `static {}` initialization block:
 *
 * ```js
 * export class CebStatsRow extends HTMLElement {
 *   static name = "ceb-stats-row";
 *   static live = true;
 *
 *   static {
 *     componentDecorator("StatsRow", CebStatsRow);
 *   }
 *
 *   render(state) {
 *     return html`...`;
 *   }
 * }
 * ```
 *
 * The decorator applies the metadata as prototype mixins:
 * - `static attributes = { name: handler }` -> `observedAttributes` +
 *   `handleNameAttributeChanged(oldValue, newValue)`.
 * - `static events = { type: handler }` -> delegated listener via
 *   `handleEvent` + `handleTypeEvent(event)`.
 * - live rendering -> `connectedCallback` subscribes to `store:change` and
 *   commits `render(store.snapshot())` through the template engine.
 * - `afterRender()` hook runs after each commit, for values the template
 *   engine cannot set declaratively (e.g. `<select>` value after its options).
 *
 * There are no base classes: every component keeps extending its native
 * element and the shared behavior is mixed in.
 */
import { render } from "@/core/index.js";
import { store } from "@/state/store.js";

/** @type {Map<string, CustomElementConstructor>} */
const registry = new Map();

/**
 * Turn an attribute or event name into a PascalCase suffix.
 * @param {string} value
 * @returns {string}
 * @example pascalize("data-id") // "DataId"
 * @example pascalize("ceb:action") // "CebAction"
 */
export function pascalize(value) {
  return String(value)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Build the `handle<Name>AttributeChanged` methods from `static attributes`.
 * @param {Record<string, (oldValue: unknown, newValue: unknown) => void>} attributes
 * @returns {Record<string, unknown>}
 */
export function buildAttributeHandlers(attributes) {
  const handlers = {};

  for (const [name, handler] of Object.entries(attributes)) {
    handlers[`handle${pascalize(name)}AttributeChanged`] = handler;
  }

  return handlers;
}

/**
 * Build the `handle<Name>Event` methods from `static events`.
 * @param {Record<string, (event: Event) => void>} events
 * @returns {Record<string, unknown>}
 */
export function buildEventHandlers(events) {
  const handlers = {};

  for (const [type, handler] of Object.entries(events)) {
    handlers[`handle${pascalize(type)}Event`] = handler;
  }

  return handlers;
}

/**
 * Build the lifecycle methods shared by every component.
 * @param {typeof HTMLElement & { events?: Record<string, unknown>, live?: boolean }} component
 * @returns {Record<string, unknown>}
 */
export function buildLifecycleMethods(component) {
  const eventTypes = Object.keys(component.events ?? {});

  return {
    /**
     * Delegated listener: routes to `handle<Type>Event`.
     * @param {Event} event
     */
    handleEvent(event) {
      this[`handle${pascalize(event.type)}Event`]?.(event);
    },

    /**
     * Routes observed attribute changes to `handle<Name>AttributeChanged`.
     * @param {string} name
     * @param {unknown} oldValue
     * @param {unknown} newValue
     */
    attributeChangedCallback(name, oldValue, newValue) {
      this[`handle${pascalize(name)}AttributeChanged`]?.(oldValue, newValue);
    },

    /** Attach event listeners and start live rendering. */
    connectedCallback() {
      for (const type of eventTypes) {
        this.addEventListener(type, this);
      }

      this.onConnect?.();

      if (component.live !== false && typeof this.render === "function") {
        this._onStoreChange = () => this.update();
        window.addEventListener("store:change", this._onStoreChange);
        this.update();
      }
    },

    /** Detach listeners and release the rendered view. */
    disconnectedCallback() {
      for (const type of eventTypes) {
        this.removeEventListener(type, this);
      }

      if (this._onStoreChange) {
        window.removeEventListener("store:change", this._onStoreChange);
        this._onStoreChange = null;
      }

      this._disposeView?.();
      this.onDisconnect?.();
    },

    /** Render the current store snapshot into this element. */
    update() {
      const result = this.render(store.snapshot());

      if (result == null) {
        return;
      }

      this._disposeView = render(result, this);
      this.afterRender?.();
    },
  };
}

/**
 * Merge the metadata-driven mixins into the component prototype.
 * @param {typeof HTMLElement & { attributes?: Record<string, unknown>, events?: Record<string, unknown> }} component
 * @returns {void}
 */
export function applyMixins(component) {
  Object.assign(
    component.prototype,
    component.attributes && buildAttributeHandlers(/** @type {Record<string, (o: unknown, n: unknown) => void>} */ (component.attributes)),
    component.events && buildEventHandlers(/** @type {Record<string, (e: Event) => void>} */ (component.events)),
    buildLifecycleMethods(component)
  );

  if (component.attributes) {
    Object.defineProperty(component, "observedAttributes", {
      get: () => Object.keys(component.attributes ?? {}),
    });
  }
}

/**
 * Register the element, honoring `static extends` for customized built-ins.
 * @param {typeof HTMLElement & { name: string, extends?: string }} component
 * @returns {void}
 */
export function defineCustomElement(component) {
  if (!customElements.get(component.name)) {
    customElements.define(component.name, component, component.extends ? { extends: component.extends } : undefined);
  }
}

/**
 * Expose the component in the local registry (for debugging / tooling).
 * @param {string} componentName
 * @param {CustomElementConstructor} component
 * @returns {void}
 */
export function exposeComponent(componentName, component) {
  registry.set(componentName, component);
}

/**
 * Read a registered component by name.
 * @param {string} componentName
 * @returns {CustomElementConstructor | undefined}
 */
export function getComponent(componentName) {
  return registry.get(componentName);
}

/**
 * Register a component and apply its metadata mixins.
 * @param {string} componentName
 * @param {typeof HTMLElement & { name: string, extends?: string }} component
 * @returns {void}
 */
export function componentDecorator(componentName, component) {
  applyMixins(component);
  defineCustomElement(component);
  exposeComponent(componentName, component);
}
