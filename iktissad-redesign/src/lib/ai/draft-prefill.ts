/**
 * draft-prefill — turns the `?draft=` / `?brief=` query payloads that the
 * AI Content Agent and Article Brief Generator pass to /admin/articles/new
 * into the columns we insert on the freshly-created draft row.
 *
 * The article body is canonically TipTap JSON (jsonb `body` column), so we
 * convert the AI's lightly-marked-down text into a TipTap doc here rather than
 * storing raw markdown that the editor would render as literal characters.
 *
 * Everything is best-effort: malformed JSON or unexpected shapes yield `null`,
 * and the caller falls back to creating a blank draft.
 */

import type { JSONContent } from '@tiptap/core';

// Mirrors the article_type enum on the articles table.
const VALID_ARTICLE_TYPES = ['news', 'report', 'analysis', 'interview', 'opinion'] as const;
type ValidArticleType = (typeof VALID_ARTICLE_TYPES)[number];

function normalizeArticleType(t: unknown): ValidArticleType | undefined {
  return typeof t === 'string' && (VALID_ARTICLE_TYPES as readonly string[]).includes(t)
    ? (t as ValidArticleType)
    : undefined;
}

/** Fields we know how to seed onto a new draft row. */
export interface DraftPrefill {
  title?: string;
  excerpt?: string;
  tags?: string[];
  articleType?: ValidArticleType;
  metaDescription?: string;
  /** TipTap doc — stored in `body` (jsonb); the caller also stringifies it into `content`. */
  body?: JSONContent;
}

// ── TipTap node builders (RTL-aligned, matching saved article bodies) ──────────

/** Split inline `**bold**` runs into TipTap text nodes; drops empty segments. */
function inlineNodes(text: string): JSONContent[] {
  const out: JSONContent[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(last, m.index);
    if (before) out.push({ type: 'text', text: before });
    if (m[1]) out.push({ type: 'text', text: m[1], marks: [{ type: 'bold' }] });
    last = re.lastIndex;
  }
  const tail = text.slice(last);
  if (tail) out.push({ type: 'text', text: tail });
  return out;
}

function paragraph(text: string): JSONContent {
  const content = inlineNodes(text);
  // A paragraph with no text content is a valid empty paragraph (no `content`).
  return content.length
    ? { type: 'paragraph', attrs: { textAlign: 'right' }, content }
    : { type: 'paragraph', attrs: { textAlign: 'right' } };
}

function heading(level: 1 | 2 | 3, text: string): JSONContent {
  return { type: 'heading', attrs: { level, textAlign: 'right' }, content: inlineNodes(text) };
}

function listItem(text: string): JSONContent {
  return { type: 'listItem', content: [paragraph(text)] };
}

/**
 * Convert lightly-marked-down text to a TipTap doc. Blocks are separated by
 * blank lines; supports `#`/`##`/`###` headings, `-`/`*` bullet lists, and
 * `1.` ordered lists. Anything else becomes a paragraph (multi-line blocks are
 * joined with spaces). Inline `**bold**` is preserved.
 */
export function markdownToTiptapDoc(md: string): JSONContent {
  const blocks = md
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const content: JSONContent[] = [];

  for (const block of blocks) {
    const headingMatch = block.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch && !block.includes('\n')) {
      content.push(heading(headingMatch[1].length as 1 | 2 | 3, headingMatch[2].trim()));
      continue;
    }

    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);

    if (lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l))) {
      content.push({
        type: 'bulletList',
        content: lines.map((l) => listItem(l.replace(/^[-*]\s+/, ''))),
      });
      continue;
    }

    if (lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l))) {
      content.push({
        type: 'orderedList',
        content: lines.map((l) => listItem(l.replace(/^\d+\.\s+/, ''))),
      });
      continue;
    }

    content.push(paragraph(lines.join(' ')));
  }

  if (content.length === 0) content.push({ type: 'paragraph', attrs: { textAlign: 'right' } });
  return { type: 'doc', content };
}

// ── Query-param parsers ────────────────────────────────────────────────────────

/** Parse the `?draft=` payload from the AI Content Agent (a full draft). */
export function parseDraftParam(raw: string | undefined): DraftPrefill | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    const prefill: DraftPrefill = {};

    if (typeof d.title === 'string' && d.title.trim()) prefill.title = d.title.trim();
    if (typeof d.excerpt === 'string' && d.excerpt.trim()) prefill.excerpt = d.excerpt.trim();
    if (Array.isArray(d.tags)) {
      const tags = d.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
      if (tags.length) prefill.tags = tags;
    }
    const articleType = normalizeArticleType(d.type);
    if (articleType) prefill.articleType = articleType;
    if (typeof d.metaDescription === 'string' && d.metaDescription.trim()) {
      prefill.metaDescription = d.metaDescription.trim();
    }
    if (typeof d.content === 'string' && d.content.trim()) {
      prefill.body = markdownToTiptapDoc(d.content);
    }

    return Object.keys(prefill).length ? prefill : null;
  } catch {
    return null;
  }
}

/**
 * Parse the `?brief=` payload from the Article Brief Generator (a structured
 * outline, not a full draft). Builds a scaffold body: the introduction
 * followed by each outline section as a heading + its description guidance.
 */
export function parseBriefParam(raw: string | undefined): DraftPrefill | null {
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as Record<string, unknown>;
    const prefill: DraftPrefill = {};

    if (typeof b.suggestedHeadline === 'string' && b.suggestedHeadline.trim()) {
      prefill.title = b.suggestedHeadline.trim();
    }
    const articleType = normalizeArticleType(b.recommendedType);
    if (articleType) prefill.articleType = articleType;
    if (Array.isArray(b.seoKeywords)) {
      const tags = b.seoKeywords.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
      if (tags.length) prefill.tags = tags;
    }
    if (typeof b.suggestedAngle === 'string' && b.suggestedAngle.trim()) {
      prefill.excerpt = b.suggestedAngle.trim();
    }

    const content: JSONContent[] = [];
    if (typeof b.introduction === 'string' && b.introduction.trim()) {
      for (const para of b.introduction.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)) {
        content.push(paragraph(para));
      }
    }
    if (Array.isArray(b.outlineSections)) {
      for (const section of b.outlineSections) {
        if (!section || typeof section !== 'object') continue;
        const sec = section as Record<string, unknown>;
        if (typeof sec.title === 'string' && sec.title.trim()) content.push(heading(2, sec.title.trim()));
        if (typeof sec.description === 'string' && sec.description.trim()) {
          content.push(paragraph(sec.description.trim()));
        }
      }
    }
    if (content.length) prefill.body = { type: 'doc', content };

    return Object.keys(prefill).length ? prefill : null;
  } catch {
    return null;
  }
}
