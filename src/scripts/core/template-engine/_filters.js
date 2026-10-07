// @ts-check
/**
 * @module core/template-engine/_filters
 * Filter registry and built-in filters for `{{ expr | filter }}` pipes.
 */

/** @type {Record<string, (value: unknown, ...args: unknown[]) => unknown>} */
export const FILTERS = {};

/**
 * Register (or override) a template filter.
 * @param {string} name Filter name used in `{{ value | name:arg }}`.
 * @param {(value: unknown, ...args: unknown[]) => unknown} fn Filter function.
 */
export function registerFilter(name, fn) {
  FILTERS[name] = fn;
}

/**
 * Slugify a string: lowercase, trim, collapse non-word runs into `-`.
 * @param {unknown} value
 * @returns {string}
 */
export function utilSlug(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── String filters ────────────────────────────────────────────────────────────

registerFilter("upper", (v) => String(v).toUpperCase());
registerFilter("lower", (v) => String(v).toLowerCase());
registerFilter("capitalize", (v) => {
  const s = String(v);
  return s[0] ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
});
registerFilter("slugify", (v) => utilSlug(v));
registerFilter("slug", (v) => utilSlug(v));
registerFilter("trim", (v) => String(v).trim());
registerFilter("escapeHtml", (v) => String(v).replace(/[&<>"']/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[s] ?? s));
registerFilter("striptags", (v) => String(v).replace(/<[^>]*>/g, ""));
registerFilter("raw", (v) => v);
registerFilter("json", (v) => {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
});
registerFilter("default", (v, d = "") => (v !== undefined && v !== null && v !== "" ? v : d));
registerFilter("truncate", (v, l) => {
  const limit = typeof l === "number" ? l : 100;
  const s = String(v);
  return s.length > limit ? `${s.slice(0, limit)}...` : s;
});

// ── Collection filters ────────────────────────────────────────────────────────

registerFilter("length", (v) => (Array.isArray(v) || typeof v === "string" ? v.length : 0));
registerFilter("first", (v) => (Array.isArray(v) && v.length ? v[0] : v));
registerFilter("last", (v) => (Array.isArray(v) && v.length ? v[v.length - 1] : v));
registerFilter("join", (v, sep) => {
  if (!Array.isArray(v)) return v;
  const separator = typeof sep === "string" ? sep : ", ";
  return v.map((item) => (typeof item === "object" && item !== null && item.label ? item.label : String(item))).join(separator);
});
registerFilter("sortBy", (array, prop, dir) => {
  if (!Array.isArray(array)) return array;
  const property = String(prop);
  const direction = dir === "desc" ? "desc" : "asc";
  return [...array].sort((a, b) => {
    let va = a[property];
    let vb = b[property];
    if (property === "date") {
      va = new Date(va);
      vb = new Date(vb);
    }
    const asc = va > vb ? 1 : va < vb ? -1 : 0;
    return direction === "desc" ? -asc : asc;
  });
});

// ── Tag helpers (docs/portal use) ─────────────────────────────────────────────

registerFilter("tagLabel", (tag) => {
  if (!tag) return "";
  const record = typeof tag === "object" ? /** @type {Record<string, unknown>} */ (tag) : null;
  const raw = record ? record.label || record.name || String(tag) : String(tag);
  /** @type {Record<string, string>} */
  const map = { css: "CSS", html: "HTML" };
  return map[String(raw).toLowerCase().trim()] || raw;
});
registerFilter("tagHref", (tag) => {
  if (!tag) return "/tags/";
  if (typeof tag === "object") {
    const record = /** @type {Record<string, unknown>} */ (tag);
    if (record.url) return String(record.url).startsWith("/") ? String(record.url) : `/${String(record.url)}`;
    return `/tags/${utilSlug(String(record.key || record.name || String(tag)))}.html`;
  }
  return `/tags/${utilSlug(tag)}.html`;
});

// ── Date filters ──────────────────────────────────────────────────────────────

registerFilter("date", (value, format) => {
  const d = new Date(/** @type {string | number | Date} */ (value));
  if (Number.isNaN(d.getTime())) return value;
  switch (format) {
    case "YYYY-MM-DD":
      return d.toISOString().split("T")[0];
    case "long":
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    case "short":
      return d.toLocaleDateString("en-US", { year: "2-digit", month: "numeric", day: "numeric" });
    case "full":
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    case "iso":
      return d.toISOString();
    case "DD MMM YYYY": {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    default: {
      const locale = typeof format === "string" ? format : "en-US";
      try {
        return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
      } catch {
        return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      }
    }
  }
});
registerFilter("timeAgo", (value) => {
  const d = new Date(/** @type {string | number | Date} */ (value));
  if (Number.isNaN(d.getTime())) return value;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return d.toLocaleDateString("en-US");
});

// ── Misc ──────────────────────────────────────────────────────────────────────

registerFilter("urlencode", (v) => encodeURIComponent(String(v)));
