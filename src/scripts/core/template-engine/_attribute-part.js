// @ts-check
/**
 * @module core/template-engine/_attribute-part
 * HTML attribute part + `model` two-way binding directive support.
 */

import { Part } from "./_part.js";
import { isDirective } from "./_template-helpers.js";
import { inferModelProperty } from "./_range.js";
import { defineDisposable } from "../disposable/index.js";

/**
 * Two-way binding configuration for the `model` attribute.
 * @typedef {object} ModelConfig
 * @property {() => unknown} get Reads the current bound value.
 * @property {(value: unknown) => void} set Writes a new bound value.
 * @property {string} [event] DOM event driving the binding (default `'input'`).
 * @property {string} [prop] Bound property (default `'value'`, `'checked'`
 *   for checkboxes).
 */

/**
 * Active model binding state.
 * @typedef {object} ModelBinding
 * @property {ModelConfig} config
 * @property {string} eventName
 * @property {string} property
 * @property {() => void} sync
 */

/**
 * Writes values to an HTML attribute (`attr=${value}`), handling the
 * `model` directive for two-way form bindings.
 */
export class AttributePart extends Part {
  /**
   * @param {Element} element
   * @param {string} name Attribute name.
   */
  constructor(element, name) {
    super();
    this.element = element;
    this.name = name;
    /** @type {(() => void) | null} Model cleanup (listener removal). */
    this.modelCleanup = null;
    /** @type {ModelBinding | null} Active model binding state. */
    this._modelBinding = null;
  }

  /**
   * @param {unknown} value Value or `model` directive.
   */
  setValue(value) {
    if (this.name === "model") {
      if (isDirective(value, "model")) {
        this.commitModel(/** @type {ModelConfig} */ (value.payload));
        this.value = value;
        return;
      }
      // Accept a raw `{ get, set }` config object - the documented
      // `model=${{ get, set }}` shorthand.
      const rawConfig = value && typeof value === "object" ? /** @type {Partial<ModelConfig>} */ (value) : null;
      if (rawConfig && typeof rawConfig.get === "function" && typeof rawConfig.set === "function") {
        this.commitModel(/** @type {ModelConfig} */ (rawConfig));
        this.value = value;
        return;
      }
    }
    this.disposeModel();
    this.commit(value);
  }

  /**
   * Write a value to the attribute. `null`/`undefined`/`false` remove it;
   * `true` writes an empty attribute.
   * @param {unknown} value
   */
  commit(value) {
    if (value == null || value === false) {
      this.element.removeAttribute(this.name);
      return;
    }
    this.element.setAttribute(this.name, value === true ? "" : String(value));
  }

  /**
   * Install a two-way binding for the `model` directive payload.
   * @param {ModelConfig} config
   */
  commitModel(config) {
    const eventName = config.event ?? "input";
    const property = config.prop ?? inferModelProperty(this.element);

    if (this._modelBinding && this._modelBinding.eventName === eventName && this._modelBinding.property === property) {
      this._modelBinding.config = config;
      this._modelBinding.sync();
      return;
    }

    this.disposeModel();

    /** @type {ModelBinding} */
    const binding = { config, eventName, property, sync: () => {} };

    const sync = () => {
      const next = binding.config.get();
      const el = /** @type {HTMLInputElement} */ (/** @type {unknown} */ (this.element));
      if (property === "checked") {
        const nextChecked = Boolean(next);
        if (el.checked !== nextChecked) el.checked = nextChecked;
        return;
      }
      const nextValue = next ?? "";
      const elRecord = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (el));
      if (elRecord[property] === nextValue) return;
      const isActive = document.activeElement === this.element;
      const selectionStart = typeof el.selectionStart === "number" ? el.selectionStart : null;
      const selectionEnd = typeof el.selectionEnd === "number" ? el.selectionEnd : null;
      elRecord[property] = nextValue;
      if (isActive && selectionStart !== null && selectionEnd !== null) {
        const len = String(nextValue).length;
        el.setSelectionRange(Math.min(selectionStart, len), Math.min(selectionEnd, len));
      }
    };

    binding.sync = sync;
    this._modelBinding = binding;

    const onInput = (/** @type {Event} */ event) => {
      const target = /** @type {HTMLInputElement} */ (/** @type {unknown} */ (event.currentTarget));
      binding.config.set(property === "checked" ? target.checked : /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (target))[property]);
    };
    this.element.addEventListener(eventName, onInput);
    this.modelCleanup = () => {
      this.element.removeEventListener(eventName, onInput);
      this._modelBinding = null;
    };

    sync();
  }

  /** Remove the model binding listener, if any. */
  disposeModel() {
    if (this.modelCleanup) {
      this.modelCleanup();
      this.modelCleanup = null;
    }
  }

  /** Release the model binding. */
  dispose() {
    this.disposeModel();
  }
}

defineDisposable(AttributePart);
