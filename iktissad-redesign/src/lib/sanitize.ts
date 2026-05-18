/**
 * HTML sanitization for untrusted (or partially-trusted) content rendered via
 * `dangerouslySetInnerHTML`. The allowlists are tuned to match TipTap output
 * plus the bidi wrappers added by `addBidiIsolation()` (see `src/lib/i18n/format.ts`).
 *
 * - Strips `<script>`, `<style>`, inline event handlers (`onclick=...`),
 *   `javascript:` URLs, and any tag/attribute not on the allowlist.
 * - Preserves `<bdi>` and `<span>` so bidi-isolation wrappers survive sanitization.
 * - Preserves Unicode bidi control marks inside text nodes.
 *
 * Call this BEFORE `addBidiIsolation()` only if you want bidi wrappers to be
 * generated from already-sanitized text. In practice we sanitize the raw
 * article body first, then run `addBidiIsolation()` on the sanitized HTML —
 * the wrapper produces `<bdi>` / `<span>` tags which are themselves on the
 * allowlist, so the order is "sanitize -> bidi-wrap" for content stored in
 * the DB, but if you're sanitizing pre-wrapped HTML the `<bdi>`/`<span>`
 * tags survive either way.
 */
import sanitizeHtml from "sanitize-html";

/** Common bits shared by every profile. */
const COMMON_ALLOWED_SCHEMES = ["http", "https", "mailto"];

/** Iframe `src` is restricted to known video embeds only. */
const IFRAME_HOSTNAME_ALLOWLIST = [
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "youtube.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com",
];

/**
 * Allowed-class filter used to keep TipTap's structural classes
 * (`text-align-*`, `is-empty`, etc.) but drop arbitrary author-supplied
 * class names that could collide with our own styles.
 */
function classFilter(value: string): string {
  return value
    .split(/\s+/)
    .filter((cls) =>
      // Keep TipTap/tailwind utility-like and bidi classes; drop anything else.
      /^(text-(left|right|center|justify|start|end)|is-empty|tiptap-[a-z0-9-]+|bidi-[a-z0-9-]+)$/.test(
        cls
      )
    )
    .join(" ");
}

/** Article body sanitization profile — covers the full TipTap schema. */
const ARTICLE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "blockquote",
    "strong",
    "em",
    "u",
    "s",
    "code",
    "pre",
    "br",
    "hr",
    "a",
    "img",
    "figure",
    "figcaption",
    "span",
    "bdi",
    "iframe",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    span: ["class", "dir"],
    bdi: ["dir"],
    p: ["dir"],
    h1: ["dir", "id"],
    h2: ["dir", "id"],
    h3: ["dir", "id"],
    h4: ["dir", "id"],
    blockquote: ["dir", "cite"],
    figure: ["class"],
    figcaption: ["dir"],
    iframe: [
      "src",
      "title",
      "width",
      "height",
      "frameborder",
      "allow",
      "allowfullscreen",
    ],
  },
  allowedSchemes: COMMON_ALLOWED_SCHEMES,
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
  allowProtocolRelative: false,
  // Strip the whole tag *and its contents* for these — default sanitize-html
  // would only strip the tag and keep inner text.
  disallowedTagsMode: "discard",
  nonTextTags: ["style", "script", "textarea", "option", "noscript"],
  // Per-tag transformers — enforce target=_blank rel and clamp iframe sources.
  transformTags: {
    a: (tagName, attribs) => {
      const out: Record<string, string> = { ...attribs };
      if (out.target === "_blank") {
        // Always add rel for tabnabbing protection.
        const rel = (out.rel ?? "").split(/\s+/).filter(Boolean);
        if (!rel.includes("noopener")) rel.push("noopener");
        if (!rel.includes("noreferrer")) rel.push("noreferrer");
        out.rel = rel.join(" ");
      }
      return { tagName, attribs: out };
    },
    iframe: (tagName, attribs) => {
      const src = attribs.src ?? "";
      try {
        const url = new URL(src);
        const ok =
          (url.protocol === "https:" || url.protocol === "http:") &&
          IFRAME_HOSTNAME_ALLOWLIST.includes(url.hostname);
        if (!ok) {
          // Drop the tag entirely.
          return { tagName: "", attribs: {} };
        }
      } catch {
        return { tagName: "", attribs: {} };
      }
      return { tagName, attribs };
    },
    span: (tagName, attribs) => {
      const out: Record<string, string> = { ...attribs };
      if (typeof out.class === "string") {
        const cleaned = classFilter(out.class);
        if (cleaned) out.class = cleaned;
        else delete out.class;
      }
      return { tagName, attribs: out };
    },
  },
};

/** Live-blog updates are short and don't need media — restrict tighter. */
const LIVE_BLOG_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "ul",
    "ol",
    "li",
    "blockquote",
    "strong",
    "em",
    "u",
    "s",
    "code",
    "br",
    "a",
    "span",
    "bdi",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    span: ["class", "dir"],
    bdi: ["dir"],
    p: ["dir"],
  },
  allowedSchemes: COMMON_ALLOWED_SCHEMES,
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  nonTextTags: ["style", "script", "textarea", "option", "noscript"],
  transformTags: {
    a: (tagName, attribs) => {
      const out: Record<string, string> = { ...attribs };
      if (out.target === "_blank") {
        const rel = (out.rel ?? "").split(/\s+/).filter(Boolean);
        if (!rel.includes("noopener")) rel.push("noopener");
        if (!rel.includes("noreferrer")) rel.push("noreferrer");
        out.rel = rel.join(" ");
      }
      return { tagName, attribs: out };
    },
    span: (tagName, attribs) => {
      const out: Record<string, string> = { ...attribs };
      if (typeof out.class === "string") {
        const cleaned = classFilter(out.class);
        if (cleaned) out.class = cleaned;
        else delete out.class;
      }
      return { tagName, attribs: out };
    },
  },
};

/** Sanitize a full article body produced by TipTap (or legacy editors). */
export function sanitizeArticleHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, ARTICLE_OPTIONS);
}

/** Sanitize a short live-blog update. */
export function sanitizeLiveBlogHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, LIVE_BLOG_OPTIONS);
}
