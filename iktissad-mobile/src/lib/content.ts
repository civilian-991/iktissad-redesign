import { parse, NodeType, type HTMLElement, type Node } from 'node-html-parser';

/**
 * Article bodies come in two shapes: TipTap JSON (everything written in the
 * new CMS) and legacy HTML (the ~34k migrated articles). Both are normalised
 * into these blocks and rendered with native Text/Image — no WebView.
 */
export type Run = { text: string; bold?: boolean; italic?: boolean; href?: string };

export type Block =
  | { kind: 'paragraph'; runs: Run[] }
  | { kind: 'heading'; runs: Run[] }
  | { kind: 'quote'; runs: Run[] }
  | { kind: 'listItem'; runs: Run[]; marker: string }
  | { kind: 'image'; src: string; caption?: string }
  | { kind: 'embed'; url: string };

export function parseContent(content: string | null | undefined): Block[] {
  const raw = (content ?? '').trim();
  if (!raw) return [];
  if (raw.startsWith('{')) {
    try {
      return fromTiptap(JSON.parse(raw));
    } catch {
      // Not JSON after all — fall through to HTML.
    }
  }
  return fromHtml(raw);
}

// ─── TipTap JSON ────────────────────────────────────────────────────────────

type TNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: TNode[];
};

function tiptapRuns(nodes: TNode[] = []): Run[] {
  const runs: Run[] = [];
  for (const n of nodes) {
    if (n.type === 'text' && n.text) {
      const marks = n.marks ?? [];
      const link = marks.find((m) => m.type === 'link');
      runs.push({
        text: n.text,
        bold: marks.some((m) => m.type === 'bold'),
        italic: marks.some((m) => m.type === 'italic'),
        href: typeof link?.attrs?.href === 'string' ? link.attrs.href : undefined,
      });
    } else if (n.type === 'hardBreak') {
      runs.push({ text: '\n' });
    } else if (n.content) {
      runs.push(...tiptapRuns(n.content));
    }
  }
  return runs;
}

function fromTiptap(doc: TNode): Block[] {
  const out: Block[] = [];
  const visit = (n: TNode, ctx: { quote?: boolean } = {}) => {
    switch (n.type) {
      case 'paragraph': {
        const runs = tiptapRuns(n.content);
        if (hasText(runs)) out.push({ kind: ctx.quote ? 'quote' : 'paragraph', runs });
        return;
      }
      case 'heading': {
        const runs = tiptapRuns(n.content);
        if (hasText(runs)) out.push({ kind: 'heading', runs });
        return;
      }
      case 'image': {
        const src = n.attrs?.src;
        if (typeof src === 'string' && src) {
          const caption = (n.attrs?.title || n.attrs?.alt) as string | undefined;
          out.push({ kind: 'image', src, caption: caption || undefined });
        }
        return;
      }
      case 'blockquote':
      case 'pullQuote':
        n.content?.forEach((c) => visit(c, { quote: true }));
        return;
      case 'bulletList':
      case 'orderedList': {
        const ordered = n.type === 'orderedList';
        n.content?.forEach((li, i) => {
          const runs = tiptapRuns(li.content);
          if (hasText(runs)) out.push({ kind: 'listItem', runs, marker: ordered ? `${i + 1}.` : '•' });
        });
        return;
      }
      case 'youtube':
      case 'video':
      case 'iframe':
      case 'embed': {
        const src = n.attrs?.src ?? n.attrs?.url;
        if (typeof src === 'string' && src) out.push({ kind: 'embed', url: src });
        return;
      }
      default:
        n.content?.forEach((c) => visit(c, ctx));
    }
  };
  visit(doc);
  return out;
}

// ─── Legacy HTML ────────────────────────────────────────────────────────────

const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'figure', 'center']);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function htmlRuns(node: Node, style: Omit<Run, 'text'> = {}): Run[] {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = decode(node.rawText).replace(/[\s​]+/g, ' ');
    return text ? [{ text, ...style }] : [];
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return [];
  const el = node as HTMLElement;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'br') return [{ text: '\n' }];
  if (tag === 'script' || tag === 'style' || tag === 'img' || tag === 'iframe') return [];
  const next = { ...style };
  if (tag === 'strong' || tag === 'b') next.bold = true;
  if (tag === 'em' || tag === 'i') next.italic = true;
  if (tag === 'a') {
    const href = el.getAttribute('href');
    if (href && /^https?:/.test(href)) next.href = href;
  }
  return el.childNodes.flatMap((c) => htmlRuns(c, next));
}

function fromHtml(html: string): Block[] {
  const root = parse(html, { blockTextElements: { script: false, style: false } });
  const out: Block[] = [];
  let pending: Run[] = [];

  const flush = () => {
    if (hasText(pending)) out.push({ kind: 'paragraph', runs: trimRuns(pending) });
    pending = [];
  };

  const visit = (node: Node) => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      pending.push(...htmlRuns(node));
      return;
    }
    if (node.nodeType !== NodeType.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase() ?? '';

    if (tag === 'img') {
      flush();
      const src = el.getAttribute('src');
      if (src && /^https?:/.test(src)) out.push({ kind: 'image', src, caption: el.getAttribute('alt') || undefined });
      return;
    }
    if (tag === 'iframe' || tag === 'video') {
      flush();
      const src = el.getAttribute('src') ?? el.querySelector('source')?.getAttribute('src');
      if (src) out.push({ kind: 'embed', url: src.startsWith('//') ? `https:${src}` : src });
      return;
    }
    if (HEADING_TAGS.has(tag)) {
      flush();
      const runs = trimRuns(htmlRuns(el));
      if (hasText(runs)) out.push({ kind: 'heading', runs });
      return;
    }
    if (tag === 'blockquote') {
      flush();
      const runs = trimRuns(htmlRuns(el));
      if (hasText(runs)) out.push({ kind: 'quote', runs });
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      flush();
      el.querySelectorAll('li').forEach((li, i) => {
        const runs = trimRuns(htmlRuns(li));
        if (hasText(runs)) out.push({ kind: 'listItem', runs, marker: tag === 'ol' ? `${i + 1}.` : '•' });
      });
      return;
    }
    if (BLOCK_TAGS.has(tag)) {
      // Blocks may hold images or nested blocks (common in migrated HTML).
      flush();
      el.childNodes.forEach(visit);
      flush();
      return;
    }
    // Inline element at block level: images can still hide inside it.
    if (el.querySelector('img, iframe')) {
      el.childNodes.forEach(visit);
      return;
    }
    pending.push(...htmlRuns(el));
  };

  root.childNodes.forEach(visit);
  flush();
  return out;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function hasText(runs: Run[]) {
  return runs.some((r) => r.text.replace(/[\s​ ]/g, '').length > 0);
}

function trimRuns(runs: Run[]): Run[] {
  const copy = runs.map((r) => ({ ...r }));
  while (copy.length && !copy[0].text.trim()) copy.shift();
  while (copy.length && !copy[copy.length - 1].text.trim()) copy.pop();
  if (copy.length) {
    copy[0].text = copy[0].text.trimStart();
    copy[copy.length - 1].text = copy[copy.length - 1].text.trimEnd();
  }
  return copy;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

function decode(s: string) {
  return s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Plain text for titles/excerpts that may carry stray tags or entities. */
export function plainText(s: string | null | undefined) {
  return decode((s ?? '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}
