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
