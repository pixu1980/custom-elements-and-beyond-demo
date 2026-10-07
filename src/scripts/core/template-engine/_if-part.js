// @ts-check
/**
 * @module core/template-engine/_if-part
 * `<if condition="expr">` directive: conditional block.
 */

import { evaluateExpression, parseExpression } from "./_expression-parser.js";
import { clearRange } from "./_range.js";
import { renderInnerTemplate } from "./_inner-template.js";

/**
 * Renders the inner template only while the condition is truthy.
 */
export class IfPart {
  /**
   * @param {Comment} start
   * @param {Comment} end
   * @param {import('./_expression-parser.js').ParsedExpression} conditionParsed
   * @param {string} innerTemplate Raw inner HTML.
   */
  constructor(start, end, conditionParsed, innerTemplate) {
    this.start = start;
    this.end = end;
    this.conditionParsed = conditionParsed;
    this.innerTemplate = innerTemplate;
    /** @type {Comment | null} Content range markers while visible. */
    this.contentStart = null;
    /** @type {Comment | null} */
    this.contentEnd = null;
    /** @type {boolean} Whether content is currently mounted. */
    this.visible = false;
    /** @type {object | null} */
    this.ctx = null;
  }

  /**
   * Resolve the condition and evaluate.
   * @param {object} ctx
   */
  init(ctx) {
    this.ctx = ctx;
    this.evaluate();
  }

  /**
   * Evaluate the condition and render or clear the block.
   */
  evaluate() {
    const value = evaluateExpression(this.conditionParsed, this.ctx ?? {});
    if (value) this.render();
    else this.clear();
  }

  /**
   * Mount the inner template between two fresh comment markers.
   */
  render() {
    this.clear();
    this.contentStart = document.createComment("if:cs");
    this.contentEnd = document.createComment("if:ce");
    this.end.parentNode?.insertBefore(this.contentStart, this.end);
    this.end.parentNode?.insertBefore(this.contentEnd, this.end);

    if (this.innerTemplate) {
      const rendered = renderInnerTemplate(this.innerTemplate, this.ctx ?? {});
      const tmp = document.createElement("template");
      tmp.innerHTML = rendered;
      const children = [...tmp.content.childNodes];
      const insertPoint = this.contentEnd;
      for (let i = children.length - 1; i >= 0; i--) {
        insertPoint.parentNode?.insertBefore(children[i], insertPoint);
      }
    }
    this.visible = true;
  }

  /**
   * Remove the mounted content.
   */
  clear() {
    if (this.contentStart && this.contentEnd) {
      clearRange(this.contentStart, this.contentEnd);
      this.contentStart.remove();
      this.contentEnd.remove();
      this.contentStart = null;
      this.contentEnd = null;
    }
    this.visible = false;
  }

  /** Tear down state and clear content. */
  destroy() {
    this.clear();
  }
}
