/**
 * M19 — Clean migrated HTML from article fields
 *
 * 1. Titles  — strip all HTML tags, collapse whitespace
 * 2. Excerpts — generate from content if empty (strip HTML, first ~200 chars)
 * 3. Content  — remove dir attrs, empty spacer divs, inline font/color styles
 *
 * Usage:
 *   node scripts/migration/m19-clean-html.mjs
 *   node scripts/migration/m19-clean-html.mjs --dry-run
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripTags(html) {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanTitle(title) {
  return stripTags(title);
}

function generateExcerpt(content, maxChars = 220) {
  const text = stripTags(content ?? '');
  if (text.length <= maxChars) return text;
  // Cut at last space before limit
  const cut = text.lastIndexOf(' ', maxChars);
  return text.slice(0, cut > 80 ? cut : maxChars) + '…';
}

function cleanContent(html) {
  if (!html || typeof html !== 'string') return html;

  return html
    // Remove dir attributes
    .replace(/\s*dir=["'](?:RTL|LTR|rtl|ltr|auto|Auto)["']/gi, '')
    // Remove empty spacer divs: <div> </div> or <div>&nbsp;</div>
    .replace(/<div>\s*(&nbsp;)?\s*<\/div>/gi, '')
    // Remove inline font-family, font-size, color, background-color, line-height styles
    .replace(/\s*style=["'][^"']*["']/gi, (match) => {
      // Strip only cosmetic props, keep structural ones (like text-align)
      const cleaned = match
        .replace(/font-family\s*:[^;]+;?/gi, '')
        .replace(/font-size\s*:[^;]+;?/gi, '')
        .replace(/color\s*:[^;]+;?/gi, '')
        .replace(/background(-color)?\s*:[^;]+;?/gi, '')
        .replace(/line-height\s*:[^;]+;?/gi, '')
        .replace(/mso-[^:]+:[^;]+;?/gi, '')  // MS Office junk
        .replace(/style=["']\s*["']/g, '');  // Remove empty style=""
      return cleaned === match ? match : cleaned;
    })
    // Remove <style> blocks
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove <span> tags that have no useful content (empty spans)
    .replace(/<span[^>]*>\s*<\/span>/gi, '')
    // Normalize multiple consecutive <br> to one
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
    // Trim trailing whitespace inside tags
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── Main ─────────────────────────────────────────────────────────────────────

let page = 0;
const PAGE_SIZE = 500;
let totalProcessed = 0, titleFixed = 0, excerptGenerated = 0, contentCleaned = 0;

console.log(DRY_RUN ? '── DRY RUN ──' : '── LIVE ──');

while (true) {
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, excerpt, content')
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    .order('id');

  if (error) { console.error('Fetch error:', error.message); break; }
  if (!articles || articles.length === 0) break;

  const pending = [];

  for (const a of articles) {
    const updates = {};
    let changed = false;

    // 1. Title
    const newTitle = cleanTitle(a.title ?? '');
    if (newTitle !== a.title) {
      updates.title = newTitle;
      titleFixed++;
      changed = true;
    }

    // 2. Excerpt — generate if empty
    if (!a.excerpt?.trim() && a.content) {
      const ex = generateExcerpt(a.content);
      if (ex) {
        updates.excerpt = ex;
        excerptGenerated++;
        changed = true;
      }
    }

    // 3. Content — clean HTML (only for legacy HTML strings, skip TipTap JSON)
    if (a.content && typeof a.content === 'string' && a.content.trim().startsWith('<')) {
      const newContent = cleanContent(a.content);
      if (newContent !== a.content) {
        updates.content = newContent;
        contentCleaned++;
        changed = true;
      }
    }

    if (!changed) continue;

    if (DRY_RUN) {
      if (updates.title) console.log(`[title] "${a.title?.substring(0, 60)}" → "${updates.title?.substring(0, 60)}"`);
      if (updates.excerpt) console.log(`[excerpt generated] ${updates.excerpt.substring(0, 80)}…`);
    } else {
      pending.push({ id: a.id, ...updates });
    }
  }

  // Batch flush: fire all updates concurrently (cap at CONCURRENCY)
  if (!DRY_RUN) {
    const CONCURRENCY = 20;
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      await Promise.all(
        pending.slice(i, i + CONCURRENCY).map(({ id, ...upd }) =>
          supabase.from('articles').update(upd).eq('id', id)
        )
      );
    }
  }

  totalProcessed += articles.length;
  process.stdout.write(`\rProcessed ${totalProcessed} articles (${titleFixed} titles, ${excerptGenerated} excerpts, ${contentCleaned} content)...`);

  if (articles.length < PAGE_SIZE) break;
  page++;
}

console.log(`\n\n── Done ──`);
console.log(`  Total processed : ${totalProcessed}`);
console.log(`  Titles fixed    : ${titleFixed}`);
console.log(`  Excerpts created: ${excerptGenerated}`);
console.log(`  Content cleaned : ${contentCleaned}`);
