import type { JSONContent } from '@tiptap/core';

/**
 * Normalise an article's `body` (jsonb) into a TipTap document, or null when
 * it carries no actual content.
 *
 * `articles.body` defaults to an empty jsonb array, so every row migrated from
 * the legacy sites has `body: []` while the real text sits in `content` as
 * HTML. An empty array/object is therefore "no body", not "an empty document":
 * callers must fall through to `content` instead of rendering a blank doc.
 * A bare array of nodes (some seed rows) is wrapped into a proper doc.
 */
export function asTipTapDoc(value: unknown): JSONContent | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    return value.length ? ({ type: 'doc', content: value } as JSONContent) : null;
  }
  const doc = value as JSONContent;
  if (Array.isArray(doc.content)) return doc.content.length ? doc : null;
  return Object.keys(doc).length ? doc : null;
}

/**
 * Resolve an article's editable/renderable body from its two storage columns.
 *
 * Prefer `body` (jsonb TipTap doc). If it is absent or empty, fall back to
 * `content`, which holds either legacy HTML or a JSON.stringify of the doc.
 *
 * A `content` that parses as JSON is never returned verbatim: a draft created
 * from an empty prefill stores the literal string "[]", and handing that to a
 * renderer or editor shows two characters instead of nothing. JSON that yields
 * no document means "empty", not "this text".
 */
export function resolveArticleBody(
  body: unknown,
  content: string | null | undefined,
): JSONContent | string {
  const doc = asTipTapDoc(body);
  if (doc) return doc;
  if (typeof body === 'string' && body.trim()) {
    try {
      const parsed = asTipTapDoc(JSON.parse(body));
      if (parsed) return parsed;
    } catch { /* not JSON — fall through to content */ }
  }
  const text = content ?? '';
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return asTipTapDoc(JSON.parse(trimmed)) ?? '';
    } catch { /* not JSON after all — treat as HTML/plain text */ }
  }
  return text;
}
