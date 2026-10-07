// @ts-check
/**
 * @module core/template-engine/_child-node-part
 * Renders template results, iterables and nodes between two comment markers.
 * Handles the `repeat` directive with keyed reconciliation.
 */

import { Part } from "./_part.js";
import { isDirective } from "./_template-helpers.js";
import { clearRange, isRangeBeforeReference, moveRangeBefore, normalizeExprValue } from "./_range.js";
import { defineDisposable } from "../disposable/index.js";

/**
 * @typedef {import('./_template-helpers.js').RepeatPayload} RepeatPayload
 * @typedef {import('./_template-helpers.js').TemplateResult} TemplateResult
 */

/**
 * One keyed block managed by the repeat directive.
 * @typedef {object} RepeatBlock
 * @property {string | number} key
 * @property {Comment} start
 * @property {Comment} end
 * @property {ChildNodePart} part
 * @property {unknown} item
 */

/**
 * Repeat reconciliation state.
 * @typedef {object} RepeatState
 * @property {Map<string | number, RepeatBlock>} blocks
 */

// Resolved lazily to break the circular dependency with TemplateInstance.
/** @type {typeof import('./_template-instance.js').TemplateInstance | null} */
let TemplateInstance = null;

/**
 * Register the TemplateInstance class (called once by _template-instance.js).
 * @param {typeof import('./_template-instance.js').TemplateInstance} cls
 */
export function _setTemplateInstance(cls) {
  TemplateInstance = cls;
}

/**
 * A DOM slot delimited by two comment markers. Accepts template results from
 * {@link html}, `repeat` directives (keyed lists), iterables, Nodes and
 * primitives.
 */
export class ChildNodePart extends Part {
  /**
   * @param {Comment} start
   * @param {Comment} end
   */
  constructor(start, end) {
    super();
    this.start = start;
    this.end = end;
    /** @type {Node | null} */
    this.currentNode = null;
    /** @type {import('./_template-instance.js').TemplateInstance | null} */
    this.currentTemplateInstance = null;
    /** @type {RepeatState | null} Repeat block state. */
    this.repeatState = null;
    /** @type {RepeatPayload | null} */
    this.repeatPayload = null;
  }

  /**
   * @param {unknown} value
   */
  setValue(value) {
    this.commit(value);
  }

  /**
   * @param {unknown} value
   */
  commit(value) {
    if (isDirective(value, "repeat")) {
      this.commitRepeat(/** @type {RepeatPayload} */ (value.payload));
      this.value = value;

      return;
    }

    // Leaving repeat mode: release the repeat state's block parts.
    this.repeatPayload = null;

    if (this.repeatState) {
      for (const block of this.repeatState.blocks.values()) {
        block.part.dispose();
      }

      this.repeatState = null;
    }

    if (value && typeof value === "object" && /** @type {Record<string, unknown>} */ (value).kind === "template-result") {
      this.commitTemplate(/** @type {TemplateResult} */ (value));
      this.value = value;

      return;
    }

    if (value && typeof value !== "string" && typeof (/** @type {Record<PropertyKey, unknown>} */ (value)[Symbol.iterator]) === "function") {
      this.disposeTemplateInstance();

      const fragment = document.createDocumentFragment();

      for (const item of /** @type {Iterable<unknown>} */ (value)) {
        fragment.append(item instanceof Node ? item : document.createTextNode(String(item)));
      }

      this.commitNode(fragment);
      this.value = value;

      return;
    }

    this.disposeTemplateInstance();
    this.commitNode(normalizeExprValue(value));
    this.value = value;
  }

  /**
   * @param {Node} node
   */
  commitNode(node) {
    clearRange(this.start, this.end);
    this.currentNode = node;
    this.start.parentNode?.insertBefore(node, this.end);
  }

  /**
   * Render a template result, reusing the TemplateInstance when the static
   * strings match (incremental updates).
   * @param {TemplateResult} result
   */
  commitTemplate(result) {
    const strings = result.strings;
    const context = result._context;

    if (this.currentTemplateInstance?.strings === strings) {
      if (context) {
        this.currentTemplateInstance.updateWithContext(result.values, context);
      } else {
        this.currentTemplateInstance.update(result.values);
      }

      return;
    }

    clearRange(this.start, this.end);
    this.disposeTemplateInstance();

    if (!TemplateInstance) {
      throw new Error("TemplateInstance is not initialized (module load order)");
    }

    const instance = new TemplateInstance(strings);

    this.currentTemplateInstance = instance;
    instance.updateWithContext(result.values, context || {});
    this.start.parentNode?.insertBefore(instance.fragment, this.end);
  }

  /** Dispose the current template instance, if any. */
  disposeTemplateInstance() {
    if (this.currentTemplateInstance) {
      this.currentTemplateInstance.dispose();
      this.currentTemplateInstance = null;
    }
  }

  /**
   * Keyed reconciliation for the `repeat` directive.
   * @param {RepeatPayload} payload
   */
  commitRepeat({ items, key, renderItem }) {
    this.repeatPayload = { items, key, renderItem };

    const list = Array.isArray(items)
      ? items
      : items && typeof (/** @type {Record<PropertyKey, unknown>} */ (items)[Symbol.iterator]) === "function"
        ? [.../** @type {Iterable<unknown>} */ (items)]
        : [];
    const state = /** @type {RepeatState} */ (this.repeatState ?? { blocks: new Map() });
    const nextBlocks = new Map();
    const seen = new Set();

    let ref = this.end;

    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i];
      const k = key(item, i);

      if (seen.has(k)) {
        throw new Error(`Duplicate repeat key: ${k}`);
      }

      seen.add(k);

      let block = state.blocks.get(k);

      if (!block) {
        const start = document.createComment(`rs:${k}`);
        const end = document.createComment(`re:${k}`);

        ref.parentNode?.insertBefore(start, ref);
        ref.parentNode?.insertBefore(end, ref);
        block = {
          key: k,
          start,
          end,
          part: new ChildNodePart(start, end),
          item,
        };
        block.part.setValue(renderItem(item, i));
      } else {
        if (!isRangeBeforeReference(block.start, block.end, ref)) {
          moveRangeBefore(block.start, block.end, ref);
        }

        if (block.item !== item) {
          block.part.setValue(renderItem(item, i));
          block.item = item;
        }
      }

      nextBlocks.set(k, block);
      ref = block.start;
    }

    for (const [k, block] of state.blocks) {
      if (!nextBlocks.has(k)) {
        block.part.dispose();
        clearRange(block.start, block.end);
        block.start.remove();
        block.end.remove();
      }
    }

    state.blocks = nextBlocks;
    this.repeatState = state;
    this.currentTemplateInstance = null;
  }

  /**
   * Release every subscription held by this part: repeat block parts and the
   * current template instance.
   */
  dispose() {
    this.disposeTemplateInstance();

    if (this.repeatState) {
      for (const block of this.repeatState.blocks.values()) {
        block.part.dispose();
      }

      this.repeatState = null;
    }
  }
}

defineDisposable(ChildNodePart);
