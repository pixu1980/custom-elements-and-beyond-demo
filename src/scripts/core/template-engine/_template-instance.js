// @ts-check
/**
 * @module core/template-engine/_template-instance
 * Template parsing and rendering.
 *
 * `getTemplate(strings)` parses the static strings of an `html` tagged
 * template once (cached), producing a DOM template plus a descriptor list
 * that maps `${}` / `{{ }}` slots, attributes and `<for>` / `<if>` blocks to
 * live parts. `TemplateInstance` clones the parsed template and drives those
 * parts with concrete values.
 */

import { parseExpression, evaluateExpression } from "./_expression-parser.js";
import { ChildNodePart, _setTemplateInstance } from "./_child-node-part.js";
import { AttributePart } from "./_attribute-part.js";
import { PropertyPart } from "./_property-part.js";
import { EventPart } from "./_event-part.js";
import { ExprPart } from "./_expr-part.js";
import { ForPart } from "./_for-part.js";
import { IfPart } from "./_if-part.js";
import { defineDisposable } from "../disposable/index.js";

/** @type {WeakMap<TemplateStringsArray, TemplateRecord>} */
const templateCache = new WeakMap();

const VAL_MARKER_RE = /^val:(\d+)$/;
const EXPR_MARKER_RE = /^expr:(\d+)$/;
// Attribute position only when the name is preceded by whitespace (or chunk
// start) - a `${}` directly after `>` or text is a child value, not an
// attribute (`<p>n=${x}` is text, `<input value=${x}>` is an attribute).
const ATTR_END_RE = /(^|[\s])([.@]?[-\w:]+)\s*=\s*(?:"|'|)?$/;

/**
 * @typedef {object} TemplateRecord
 * @property {HTMLTemplateElement} template Parsed static template.
 * @property {import('./_template-instance.js').TemplateDescriptor[]} descriptors
 * @property {number} exprCount
 */

/**
 * @typedef {object} TemplateDescriptor
 * @property {string} kind `'val' | 'expr' | 'attrExpr' | 'attribute' | 'property' | 'event' | 'for' | 'if'`
 * @property {number} index
 * @property {number[]} path Child-index path from the template root.
 * @property {import('./_expression-parser.js').ParsedExpression} [parsedExpr]
 * @property {string} [name]
 * @property {string} [rawName]
 * @property {string} [itemVar]
 * @property {string} [itemsExprStr]
 * @property {string} [conditionStr]
 * @property {string} [innerTemplate]
 * @property {string} [partType]
 */

/**
 * Compute the child-index path from `root` to `node`.
 * @param {Node} node
 * @param {Node} root
 * @returns {number[]}
 */
function getNodePath(node, root) {
  const path = [];
  let current = node;
  while (current && current !== root) {
    const parent = current.parentNode;
    if (!parent) break;
    let index = 0;
    let sibling = current;
    while (sibling.previousSibling) {
      sibling = sibling.previousSibling;
      index++;
    }
    path.unshift(index);
    current = parent;
  }
  return path;
}

/**
 * Resolve a child-index path back to a node.
 * @param {Node} root
 * @param {number[]} path
 * @returns {ChildNode | null}
 */
function resolveNodePath(root, path) {
  let current = /** @type {ChildNode | null} */ (root);
  for (const index of path) {
    if (!current) return null;
    current = current.childNodes[index];
  }
  return current;
}

/**
 * Parse the static strings of an `html` template (cached per strings object).
 *
 * @param {TemplateStringsArray} strings
 * @returns {TemplateRecord}
 */
export function getTemplate(strings) {
  const cached = templateCache.get(strings);
  if (cached) return cached;

  // Step 1: assemble full markup; `${}` in attribute position becomes
  // `__attr_N__`, in child position a `<!--val:N-->` comment.
  let markup = "";
  for (let i = 0; i < strings.length - 1; i++) {
    const chunk = strings[i];
    markup += chunk;
    if (ATTR_END_RE.test(chunk)) {
      markup += `__attr_${i}__`;
    } else {
      markup += `<!--val:${i}-->`;
    }
  }
  markup += strings[strings.length - 1];

  // Step 2: extract <for>/<if> directive regions.
  /** @type {Array<{ kind: string, id: number, each?: string, inner?: string, condition?: string }>} */
  const directives = [];
  let cleanedMarkup = markup;
  let directiveIdCounter = 0;

  cleanedMarkup = cleanedMarkup.replace(/<for\s+([^>]*)>([\s\S]*?)<\/for>/gi, (full, attrs, inner) => {
    const id = directiveIdCounter++;
    const eachMatch = attrs.match(/each\s*="([^"]*)"/);
    directives.push({
      kind: "for",
      id,
      each: eachMatch ? eachMatch[1] : "",
      inner,
    });
    return `<!--dir:${id}-->`;
  });
  cleanedMarkup = cleanedMarkup.replace(/<if\s+([^>]*)>([\s\S]*?)<\/if>/gi, (full, attrs, inner) => {
    const id = directiveIdCounter++;
    const condMatch = attrs.match(/condition\s*="([^"]*)"/);
    directives.push({ kind: "if", id, condition: condMatch ? condMatch[1] : "", inner });
    return `<!--dir:${id}-->`;
  });

  // Step 3: replace `{{ expr }}` with `<!--expr:IDX-->` markers.
  let exprCounter = 0;
  /** @type {Array<{ index: number, parsedExpr: import('./_expression-parser.js').ParsedExpression }>} */
  const allExprMarkers = [];
  let processed = "";
  let lastIdx = 0;
  const reExpr = /\{\{([^}]+)\}\}/g;
  let exprMatch;
  while ((exprMatch = reExpr.exec(cleanedMarkup)) !== null) {
    processed += cleanedMarkup.slice(lastIdx, exprMatch.index);
    const idx = exprCounter++;
    processed += `<!--expr:${idx}-->`;
    allExprMarkers.push({ index: idx, parsedExpr: parseExpression(exprMatch[1].trim()) });
    lastIdx = reExpr.lastIndex;
  }
  processed += cleanedMarkup.slice(lastIdx);

  // Step 4: parse into a DOM template and walk it to collect descriptors.
  const template = document.createElement("template");
  template.innerHTML = processed;

  /** @type {TemplateDescriptor[]} */
  const descriptors = [];
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  let walkNode;
  while ((walkNode = walker.nextNode())) {
    if (walkNode.nodeType === Node.COMMENT_NODE) {
      const comment = /** @type {Comment} */ (/** @type {unknown} */ (walkNode));
      const valMatch = comment.data.match(VAL_MARKER_RE);
      if (valMatch) {
        descriptors.push({
          kind: "val",
          index: Number(valMatch[1]),
          path: getNodePath(comment, template.content),
        });
        continue;
      }
      const exprMatch = comment.data.match(EXPR_MARKER_RE);
      if (exprMatch) {
        const idx = Number(exprMatch[1]);
        const info = allExprMarkers.find((e) => e.index === idx);
        descriptors.push({
          kind: "expr",
          index: idx,
          parsedExpr: info?.parsedExpr || parseExpression(""),
          path: getNodePath(comment, template.content),
        });
        continue;
      }
      const dirMatch = comment.data.match(/^dir:(\d+)$/);
      if (dirMatch) {
        const dirId = Number(dirMatch[1]);
        const dir = directives.find((d) => d.id === dirId);
        if (dir) {
          descriptors.push({
            kind: dir.kind,
            index: dirId,
            path: getNodePath(comment, template.content),
            itemVar: dir.each ? dir.each.match(/^\s*([a-zA-Z_$][\w$]*)\s+in\s+/)?.[1] : "item",
            itemsExprStr: dir.each ? dir.each.replace(/^\s*[a-zA-Z_$][\w$]*\s+in\s+/, "").trim() : "",
            conditionStr: dir.condition || "",
            innerTemplate: dir.inner || "",
          });
        }
        continue;
      }
      continue;
    }

    if (walkNode.nodeType === Node.ELEMENT_NODE) {
      const element = /** @type {Element} */ (/** @type {unknown} */ (walkNode));
      for (const attr of [...element.attributes]) {
        const attrValue = attr.value;
        // `{{ expr }}` in an attribute value was already replaced by Step 3
        // with a `<!--expr:N-->` marker - resolve it here.
        const attrExprMarker = attrValue.match(/^<!--expr:(\d+)-->$/);
        if (attrExprMarker) {
          const idx = Number(attrExprMarker[1]);
          const info = allExprMarkers.find((e) => e.index === idx);
          const rawName = attr.name;
          let partType = "attribute";
          let name = rawName;
          if (rawName.startsWith(".")) {
            partType = "property";
            name = rawName.slice(1);
          } else if (rawName.startsWith("@")) {
            partType = "event";
            name = rawName.slice(1);
          }
          descriptors.push({
            kind: "attrExpr",
            partType,
            index: idx,
            name,
            rawName,
            parsedExpr: info?.parsedExpr || parseExpression(""),
            path: getNodePath(element, template.content),
          });
          continue;
        }
        const exprInAttr = attrValue.match(/\{\{([^}]+)\}\}/);
        if (exprInAttr) {
          const idx = exprCounter++;
          const parsedExpr = parseExpression(exprInAttr[1].trim());
          const rawName = attr.name;
          let partType = "attribute";
          let name = rawName;
          if (rawName.startsWith(".")) {
            partType = "property";
            name = rawName.slice(1);
          } else if (rawName.startsWith("@")) {
            partType = "event";
            name = rawName.slice(1);
          }
          descriptors.push({
            kind: "attrExpr",
            partType,
            index: idx,
            name,
            rawName,
            parsedExpr,
            path: getNodePath(element, template.content),
          });
        }
        const valAttrMatch = attrValue.match(/^__attr_(\d+)__$/);
        if (valAttrMatch) {
          const idx = Number(valAttrMatch[1]);
          const rawName = attr.name;
          let partType = "attribute";
          let name = rawName;
          if (rawName.startsWith(".")) {
            partType = "property";
            name = rawName.slice(1);
          } else if (rawName.startsWith("@")) {
            partType = "event";
            name = rawName.slice(1);
          }
          descriptors.push({
            kind: partType,
            index: idx,
            name,
            rawName,
            path: getNodePath(element, template.content),
          });
        }
      }
    }
  }

  const record = { template, descriptors, exprCount: exprCounter };
  templateCache.set(strings, record);
  return record;
}

/**
 * A live clone of a parsed template. Holds the parts created from the
 * descriptors and updates them with concrete values/context.
 */
export class TemplateInstance {
  /**
   * @param {TemplateStringsArray} strings
   */
  constructor(strings) {
    this.strings = strings;
    const record = getTemplate(strings);
    this.fragment = record.template.content.cloneNode(true);
    /** @type {Map<number, import('./_part.js').Part | EventPart>} */
    this.parts = new Map();
    /** @type {Array<{ index: number, exprPart: ExprPart | AttributePart, parsedExpr: import('./_expression-parser.js').ParsedExpression, isAttr: boolean }>} */
    this.exprParts = [];
    /** @type {ForPart[]} */
    this.forParts = [];
    /** @type {IfPart[]} */
    this.ifParts = [];

    const resolved = record.descriptors.map((descriptor) => ({
      descriptor,
      node: descriptor.path ? resolveNodePath(this.fragment, descriptor.path) : null,
    }));

    for (const { descriptor, node } of resolved) {
      if (!node) continue;
      switch (descriptor.kind) {
        case "val":
        case "attribute":
        case "property":
        case "event": {
          let part;
          if (descriptor.kind === "val") {
            const start = document.createComment(`start:${descriptor.index}`);
            const end = document.createComment(`end:${descriptor.index}`);
            node.replaceWith(start, end);
            part = new ChildNodePart(start, end);
          } else {
            const element = /** @type {Element} */ (/** @type {unknown} */ (node));
            element.removeAttribute(descriptor.rawName ?? descriptor.name ?? "");
            if (descriptor.kind === "attribute") part = new AttributePart(element, descriptor.name ?? "");
            else if (descriptor.kind === "property") part = new PropertyPart(element, descriptor.name ?? "");
            else if (descriptor.kind === "event") part = new EventPart(element, descriptor.name ?? "");
          }
          if (part) this.parts.set(descriptor.index, part);
          break;
        }
        case "expr": {
          const start = document.createComment(`start:expr:${descriptor.index}`);
          const end = document.createComment(`end:expr:${descriptor.index}`);
          node.replaceWith(start, end);
          this.exprParts.push({
            index: descriptor.index,
            exprPart: new ExprPart(start, end),
            parsedExpr: descriptor.parsedExpr || parseExpression(""),
            isAttr: false,
          });
          break;
        }
        case "attrExpr": {
          const element = /** @type {Element} */ (/** @type {unknown} */ (node));
          element.removeAttribute(descriptor.rawName ?? descriptor.name ?? "");
          this.exprParts.push({
            index: descriptor.index,
            exprPart: new AttributePart(element, descriptor.name ?? ""),
            parsedExpr: descriptor.parsedExpr || parseExpression(""),
            isAttr: true,
          });
          break;
        }
        case "for": {
          const start = document.createComment(`for:${descriptor.index}:s`);
          const end = document.createComment(`for:${descriptor.index}:e`);
          node.replaceWith(start, end);
          const forPart = new ForPart(start, end, descriptor.itemVar || "item", parseExpression(descriptor.itemsExprStr || ""), descriptor.innerTemplate || "");
          this.forParts.push(forPart);
          break;
        }
        case "if": {
          const start = document.createComment(`if:${descriptor.index}:s`);
          const end = document.createComment(`if:${descriptor.index}:e`);
          node.replaceWith(start, end);
          this.ifParts.push(new IfPart(start, end, parseExpression(descriptor.conditionStr || ""), descriptor.innerTemplate || ""));
          break;
        }
        default:
          break;
      }
    }
  }

  /**
   * Update `${}` slots with `values` and `{{ }}`/directives with `context`.
   * @param {unknown[]} values Interpolated values from the tagged template.
   * @param {object} context Data context for expressions.
   */
  updateWithContext(values, context) {
    for (let i = 0; i < values.length; i++) {
      const part = this.parts.get(i);
      if (part) part.setValue(values[i]);
    }
    for (const { exprPart, parsedExpr, isAttr } of this.exprParts) {
      if (isAttr) {
        const value = evaluateExpression(parsedExpr, context);
        exprPart.commit(value, parsedExpr.filters.length > 0 && parsedExpr.filters[parsedExpr.filters.length - 1].name === "raw");
      } else {
        exprPart.setValue(parsedExpr, context);
      }
    }
    for (const forPart of this.forParts) {
      forPart.init(context);
    }
    for (const ifPart of this.ifParts) ifPart.init(context);
  }

  /**
   * Update only the `${}` slots (no context re-evaluation).
   * @param {unknown[]} values
   */
  update(values) {
    for (let i = 0; i < values.length; i++) {
      const part = this.parts.get(i);
      if (part) part.setValue(values[i]);
    }
  }

  /**
   * Release every subscription held by this instance's parts, repeat blocks
   * and directive state. Call when the instance is discarded.
   */
  dispose() {
    for (const part of this.parts.values()) part.dispose();
    for (const { exprPart } of this.exprParts) exprPart.dispose();
    for (const forPart of this.forParts) forPart.destroy();
    for (const ifPart of this.ifParts) ifPart.destroy();
  }
}

// Resolve the circular dependency: ChildNodePart needs TemplateInstance.
_setTemplateInstance(TemplateInstance);

defineDisposable(TemplateInstance);
