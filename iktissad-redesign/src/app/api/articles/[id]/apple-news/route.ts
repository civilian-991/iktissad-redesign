/**
 * Apple News Format Export
 * GET /api/articles/[id]/apple-news
 *
 * Converts an article to Apple News JSON format for submission.
 * Reference: https://developer.apple.com/documentation/apple_news/apple_news_format
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

const BASE_URL = 'https://www.iktissadonline.com';

interface AppleNewsDocument {
  version: string;
  identifier: string;
  title: string;
  language: string;
  layout: { columns: number; width: number };
  componentTextStyles: Record<string, unknown>;
  metadata: Record<string, unknown>;
  components: unknown[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Detect UUID vs slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const { data: article, error } = await (supabase as any)
    .from('articles')
    .select(`
      id, slug, title, title_en, excerpt, content, featured_image,
      published_at, updated_at, tags,
      users:author_id ( name ),
      sections:section_id ( name, slug )
    `)
    .eq(isUuid ? 'id' : 'slug', id)
    .eq('status', 'published')
    .single();

  if (error || !article) {
    return NextResponse.json(
      { error: 'Article not found' } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const anf = convertToAppleNews(article);

  return NextResponse.json(anf, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function convertToAppleNews(article: Record<string, any>): AppleNewsDocument {
  const authorName = article.users?.name || 'IKTISSAD';
  const sectionName = article.sections?.name || '';
  const articleUrl = `${BASE_URL}/${article.slug}`;

  // Parse HTML content into Apple News components
  const bodyComponents = htmlToAppleNewsComponents(article.content || '');

  const components: unknown[] = [];

  // Header image
  if (article.featured_image) {
    components.push({
      role: 'header',
      layout: { columnStart: 0, columnSpan: 7 },
      components: [
        {
          role: 'photo',
          URL: article.featured_image,
          layout: { columnStart: 0, columnSpan: 7 },
          caption: { text: article.title, additions: [] },
        },
      ],
    });
  }

  // Title
  components.push({
    role: 'title',
    text: article.title,
    layout: { columnStart: 0, columnSpan: 7, margin: { top: 20, bottom: 10 } },
    textStyle: 'titleStyle',
  });

  // Byline
  components.push({
    role: 'byline',
    text: `${authorName} • ${formatDate(article.published_at)}`,
    layout: { columnStart: 0, columnSpan: 7, margin: { bottom: 20 } },
    textStyle: 'bylineStyle',
  });

  // Body content
  components.push(...bodyComponents);

  return {
    version: '1.7',
    identifier: article.id,
    title: article.title,
    language: 'ar',
    layout: {
      columns: 7,
      width: 1024,
    },
    componentTextStyles: {
      titleStyle: {
        fontName: 'HelveticaNeue-Bold',
        fontSize: 28,
        lineHeight: 38,
        textAlignment: 'right',
      },
      bylineStyle: {
        fontName: 'HelveticaNeue',
        fontSize: 14,
        lineHeight: 20,
        textColor: '#666666',
        textAlignment: 'right',
      },
      bodyStyle: {
        fontName: 'Georgia',
        fontSize: 18,
        lineHeight: 30,
        textAlignment: 'right',
      },
      headingStyle: {
        fontName: 'HelveticaNeue-Bold',
        fontSize: 22,
        lineHeight: 30,
        textAlignment: 'right',
      },
      captionStyle: {
        fontName: 'HelveticaNeue-Italic',
        fontSize: 12,
        lineHeight: 18,
        textColor: '#999999',
        textAlignment: 'right',
      },
    },
    metadata: {
      datePublished: article.published_at,
      dateModified: article.updated_at || article.published_at,
      dateCreated: article.published_at,
      authors: [authorName],
      canonicalURL: articleUrl,
      excerpt: article.excerpt || '',
      keywords: article.tags || [],
      ...(sectionName && { section: sectionName }),
      thumbnailURL: article.featured_image || undefined,
    },
    components,
  };
}

/**
 * Convert HTML content to Apple News Format components.
 * Handles: paragraphs, headings, images, blockquotes, lists.
 */
function htmlToAppleNewsComponents(html: string): unknown[] {
  const components: unknown[] = [];

  if (!html || html.trim() === '') {
    return components;
  }

  // Simple regex-based parser for common HTML patterns
  // Split on block-level elements
  const blocks = html.split(/(?=<(?:p|h[1-6]|blockquote|figure|ul|ol|img)[>\s])|(?<=<\/(?:p|h[1-6]|blockquote|figure|ul|ol)>)/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Headings
    const headingMatch = trimmed.match(/^<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>$/);
    if (headingMatch) {
      const text = stripHtml(headingMatch[2]);
      if (text) {
        components.push({
          role: 'heading',
          text,
          layout: { columnStart: 0, columnSpan: 7, margin: { top: 20, bottom: 10 } },
          textStyle: 'headingStyle',
        });
      }
      continue;
    }

    // Images (standalone or in figure)
    const imgMatch = trimmed.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/);
    if (imgMatch) {
      components.push({
        role: 'photo',
        URL: imgMatch[1],
        layout: { columnStart: 0, columnSpan: 7, margin: { top: 15, bottom: 15 } },
        ...(imgMatch[2] && { caption: { text: imgMatch[2] } }),
      });
      continue;
    }

    // Blockquotes
    const quoteMatch = trimmed.match(/^<blockquote[^>]*>([\s\S]*?)<\/blockquote>$/);
    if (quoteMatch) {
      const text = stripHtml(quoteMatch[1]);
      if (text) {
        components.push({
          role: 'pullquote',
          text,
          layout: { columnStart: 1, columnSpan: 5, margin: { top: 15, bottom: 15 } },
          textStyle: 'bodyStyle',
        });
      }
      continue;
    }

    // Lists (ul/ol)
    const listMatch = trimmed.match(/^<(ul|ol)[^>]*>([\s\S]*?)<\/(?:ul|ol)>$/);
    if (listMatch) {
      const items = listMatch[2].match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];
      const text = items.map(li => `• ${stripHtml(li)}`).join('\n');
      if (text) {
        components.push({
          role: 'body',
          text,
          format: 'none',
          layout: { columnStart: 0, columnSpan: 7, margin: { top: 10, bottom: 10 } },
          textStyle: 'bodyStyle',
        });
      }
      continue;
    }

    // Paragraphs (default)
    const text = stripHtml(trimmed);
    if (text) {
      components.push({
        role: 'body',
        text,
        layout: { columnStart: 0, columnSpan: 7, margin: { top: 5, bottom: 5 } },
        textStyle: 'bodyStyle',
      });
    }
  }

  return components;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA-u-nu-latn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
