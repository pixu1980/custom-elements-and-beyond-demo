// @ts-check
/**
 * @module core/template-engine/_for-part
 * `<for each="item in items">` directive: keyed list reconciliation.
 */

import { evaluateExpression, parseExpression } from "./_expression-parser.js";
import { clearRange, isRangeBeforeReference, moveRangeBefore } from "./_range.js";
import { ChildNodePart } from "./_child-node-part.js";

/**
 * @typedef {object} ForBlock
 * @property {string | number} key Stable identity.
 * @property {Comment} start
 * @property {Comment} end
 * @property {unknown} item Last rendered item.
 * @property {ChildNodePart | null} part Component-mode part (string mode keeps this null).
 */

/**
 * Renders a `<for each="item in items">` block with keyed reconciliation.
 *
 * Each block keeps a ChildNodePart and renders its inner template as a template
 * instance bound to the item context: the engine updates the existing DOM in
 * place, so focus, caret and form state survive the store-driven re-render.
 */
export class ForPart {
  /**
   * @param {Comment} start
   * @param {Comment} end
   * @param {string} itemVar Variable name bound per iteration.
   * @param {import('./_expression-parser.js').ParsedExpression} itemsParsed
   * @param {string} innerTemplate Raw inner HTML template.
   */
  constructor(start, end, itemVar, itemsParsed, innerTemplate) {
    this.start = start;
    this.end = end;
    this.itemVar = itemVar;
    this.itemsParsed = itemsParsed;
    this.innerTemplate = innerTemplate;
    /** @type {Map<string | number, ForBlock>} Keyed block state. */
    this.blocks = new Map();
    /** @type {object | null} */
    this.ctx = null;
    /** @type {TemplateStringsArray | null} Cached single-chunk strings for the inner template. */
    this.innerStrings = null;
  }

  /**
   * Wrap the inner template into a single-chunk `strings` array so it can be
   * rendered as a template instance (cached per ForPart).
   * @returns {TemplateStringsArray}
   */
  ensureInnerStrings() {
    if (!this.innerStrings) {
      const strings = /** @type {unknown} */ ([this.innerTemplate]);
      /** @type {Record<string, unknown>} */ (strings).raw = strings;
      this.innerStrings = /** @type {TemplateStringsArray} */ (strings);
    }

    return this.innerStrings;
  }

  /**
   * Resolve the items expression and reconcile the DOM.
   * @param {object} ctx
   */
  init(ctx) {
    this.ctx = ctx;
    this.reconcile();
  }

  /**
   * Key an item: `id` for objects, JSON for objects without id, string for
   * primitives.
   * @param {unknown} item
   * @returns {string | number}
   */
  keyOf(item) {
    if (typeof item === "object" && item !== null) {
      const record = /** @type {Record<string, unknown>} */ (item);

      return /** @type {string | number} */ (record.id ?? JSON.stringify(item));
    }

    return String(item);
  }

  /**
   * Reconcile the list: move existing blocks, create new ones, remove stale.
   */
  reconcile() {
    const items = evaluateExpression(this.itemsParsed, this.ctx ?? {});
    const raw = items ?? [];
    const list = Array.isArray(raw) ? raw : typeof (/** @type {Record<PropertyKey, unknown>} */ (raw)[Symbol.iterator]) === "function" ? [.../** @type {Iterable<unknown>} */ (raw)] : [];
    const nextBlocks = new Map();
    const seen = new Set();

    let ref = this.end;

    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i];
      const key = this.keyOf(item);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      let block = this.blocks.get(key);

      if (!block) {
        const start = document.createComment(`for:${key}:s`);
        const end = document.createComment(`for:${key}:e`);

        ref.parentNode?.insertBefore(start, ref);
        ref.parentNode?.insertBefore(end, ref);
        block = { key, start, end, item, part: null };
        this.renderBlock(block, item);
      } else {
        if (!isRangeBeforeReference(block.start, block.end, ref)) {
          moveRangeBefore(block.start, block.end, ref);
        }

        if (block.item !== item) {
          this.renderBlock(block, item);
          block.item = item;
        }
      }

      nextBlocks.set(key, block);
      ref = block.start;
    }

    for (const [key, block] of this.blocks) {
      if (!nextBlocks.has(key)) {
        clearRange(block.start, block.end);
        block.start.remove();
        block.end.remove();
      }
    }

    this.blocks = nextBlocks;
  }

  /**
   * Render one block by updating its ChildNodePart in place.
   * @param {ForBlock} block
   * @param {unknown} item
   */
  renderBlock(block, item) {
    if (!block.part) {
      block.part = new ChildNodePart(block.start, block.end);
    }

    block.part.setValue({
      kind: "template-result",
      strings: this.ensureInnerStrings(),
      values: [],
      _context: { ...this.ctx, [this.itemVar]: item },
    });
  }

  /** Tear down state and remove all blocks. */
  destroy() {
    for (const block of this.blocks.values()) {
      if (block.part) {
        block.part.dispose();
      }

      clearRange(block.start, block.end);
      block.start.remove();
      block.end.remove();
    }

    this.blocks.clear();
  }
}
