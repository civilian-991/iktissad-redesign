/**
 * content-migration.ts
 *
 * Utilities for migrating legacy article.content (HTML string) to the new
 * block-based content model (ArticleBlock[]) and TipTap JSON format.
 *
 * Usage:
 *   import { htmlToArticleBlocks, articleBlocksToTipTapJSON } from '@/lib/content-migration'
 *
 *   const blocks = htmlToArticleBlocks(article.content)
 *   const json   = articleBlocksToTipTapJSON(blocks)
 */

import type { ArticleBlock } from '@/types'
import type { JSONContent } from '@tiptap/core'

// ── HTML → ArticleBlock[] ──────────────────────────────────────

/**
 * Convert a legacy HTML string to an ArticleBlock array.
 * Handles: <p>, <h2>, <h3>, <blockquote>, <img>, <hr>, <ul>/<li>.
 * Unknown tags are treated as paragraph blocks.
 */
export function htmlToArticleBlocks(html: string): ArticleBlock[] {
  if (!html || !html.trim()) return []

  const blocks: ArticleBlock[] = []

  // Simple tag-based parser using regex (no DOM dependency — works server-side)
  // Split on block-level tags while preserving the tags themselves
  let match: RegExpExecArray | null

  const re =
    /<(h[1-6]|p|blockquote|ul|ol)([^>]*)>([\s\S]*?)<\/\1>|<(img)([^>]*)\/?>|<(hr)([^>]*)\/?>/gi

  while ((match = re.exec(html)) !== null) {
    const [, tagName, , innerHtml, imgTag, imgAttrs, hrTag] = match

    if (imgTag === 'img') {
      // Image → FigureBlock
      const src = extractAttr(imgAttrs ?? '', 'src')
      const alt = extractAttr(imgAttrs ?? '', 'alt')
      if (src) {
        blocks.push({ _type: 'figure', src, alt: alt ?? '', size: 'normal' })
      }
      continue
    }

    if (hrTag === 'hr') {
      blocks.push({ _type: 'divider', style: 'line' })
      continue
    }

    if (!tagName || !innerHtml) continue

    const tag = tagName.toLowerCase()
    const text = stripTags(innerHtml).trim()

    if (!text) continue

    switch (tag) {
      case 'h2':
        blocks.push({ _type: 'heading', level: 2, text })
        break

      case 'h3':
        blocks.push({ _type: 'heading', level: 3, text })
        break

      case 'h4':
        blocks.push({ _type: 'heading', level: 4, text })
        break

      case 'h1':
        // h1 → heading level 2 (articles don't use h1 internally)
        blocks.push({ _type: 'heading', level: 2, text })
        break

      case 'blockquote':
        blocks.push({ _type: 'pullQuote', text })
        break

      case 'ul':
      case 'ol': {
        // List items → separate paragraph blocks
        const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
        let liMatch: RegExpExecArray | null
        while ((liMatch = liRe.exec(innerHtml)) !== null) {
          const liText = stripTags(liMatch[1]).trim()
          if (liText) {
            blocks.push({ _type: 'paragraph', html: `• ${liText}` })
          }
        }
        break
      }

      case 'p':
      default:
        // Check for inline <img> inside paragraph
        const imgInP = /<img([^>]*)\/?>/.exec(innerHtml)
        if (imgInP) {
          const src = extractAttr(imgInP[1], 'src')
          const alt = extractAttr(imgInP[1], 'alt')
          if (src) {
            blocks.push({ _type: 'figure', src, alt: alt ?? '', size: 'normal' })
          }
          // Also keep any text in the paragraph
          const pText = stripTags(innerHtml).trim()
          if (pText) {
            blocks.push({ _type: 'paragraph', html: pText })
          }
        } else {
          blocks.push({ _type: 'paragraph', html: innerHtml.trim() })
        }
        break
    }
  }

  return blocks
}

// ── ArticleBlock[] → TipTap JSONContent ───────────────────────

/**
 * Convert an ArticleBlock array to TipTap JSON format.
 * Used to load migrated content into the TipTap editor.
 */
export function articleBlocksToTipTapJSON(blocks: ArticleBlock[]): JSONContent {
  const content: JSONContent[] = blocks.map((block) => {
    switch (block._type) {
      case 'paragraph':
        return {
          type: 'paragraph',
          content: block.html
            ? parseInlineHtmlToTipTap(block.html)
            : [],
        }

      case 'heading':
        return {
          type: 'heading',
          attrs: { level: block.level },
          content: [{ type: 'text', text: block.text }],
        }

      case 'pullQuote':
        return {
          type: 'pullQuote',
          attrs: { attribution: block.attribution ?? '' },
          content: [{ type: 'text', text: block.text }],
        }

      case 'figure':
        return {
          type: 'figure',
          attrs: {
            src: block.src,
            alt: block.alt,
            caption: block.caption ?? '',
            credit: block.credit ?? '',
            focalX: block.focalX ?? 0.5,
            focalY: block.focalY ?? 0.5,
            width: block.size === 'wide' || block.size === 'full' ? 'full' : 'half',
          },
        }

      case 'divider':
        return { type: 'ornamentalDivider' }

      case 'sidebar':
        return {
          type: 'sidebar',
          attrs: {
            title: block.title ?? '',
            theme: block.theme ?? 'gold',
          },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: block.body }],
            },
          ],
        }

      case 'callout':
        return {
          type: 'callout',
          attrs: {
            style: block.variant,
            value: block.value ?? '',
            unit: '',
          },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: block.body ?? block.label ?? '' }],
            },
          ],
        }

      default:
        // Fallback: render unknown blocks as paragraph
        return {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: JSON.stringify(block),
            },
          ],
        }
    }
  })

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  }
}

// ── Helpers ────────────────────────────────────────────────────

/** Strip HTML tags from a string */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Extract attribute value from an HTML attribute string */
function extractAttr(attrs: string, name: string): string | undefined {
  const re = new RegExp(`${name}=["']([^"']*)["']`, 'i')
  return re.exec(attrs)?.[1]
}

/**
 * Parse an HTML string with inline marks (<strong>, <em>, <a>) into TipTap inline nodes.
 * Handles the most common cases for migrated content.
 */
function parseInlineHtmlToTipTap(html: string): JSONContent[] {
  const nodes: JSONContent[] = []

  // Simple tokenizer: split on inline tags
  const inlineRe = /<(strong|b|em|i|a|u)([^>]*)>([\s\S]*?)<\/\1>|([^<]+)/gi
  let m: RegExpExecArray | null

  while ((m = inlineRe.exec(html)) !== null) {
    const [, tagName, tagAttrs, tagInner, plainText] = m

    if (plainText !== undefined) {
      if (plainText.trim()) {
        nodes.push({ type: 'text', text: plainText })
      }
      continue
    }

    const tag = tagName?.toLowerCase()
    const inner = tagInner ? stripTags(tagInner) : ''
    if (!inner) continue

    const marks: JSONContent['marks'] = []

    if (tag === 'strong' || tag === 'b') marks.push({ type: 'bold' })
    if (tag === 'em' || tag === 'i') marks.push({ type: 'italic' })
    if (tag === 'u') marks.push({ type: 'underline' })
    if (tag === 'a') {
      const href = extractAttr(tagAttrs ?? '', 'href')
      if (href) marks.push({ type: 'link', attrs: { href } })
    }

    nodes.push({
      type: 'text',
      text: inner,
      marks: marks.length > 0 ? marks : undefined,
    })
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text: stripTags(html) }]
}
