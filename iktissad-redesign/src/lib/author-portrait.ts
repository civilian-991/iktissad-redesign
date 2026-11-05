/**
 * Editorial rule: author headshots belong to signed viewpoint pieces only.
 * News, reports and interviews carry a text-only byline so the reporting
 * reads as the publication's voice; opinion (أقلام) and analysis (عمق)
 * show the writer's portrait.
 *
 * article_type is the source of truth. Picking the أقلام or عمق section in
 * the editor sets it (SECTION_ARTICLE_TYPE below), and migration 060
 * backfilled legacy rows from their section.
 */

const PORTRAIT_TYPES = new Set(['opinion', 'analysis']);

export function showsAuthorPortrait(article: { articleType?: string | null }): boolean {
  return !!article.articleType && PORTRAIT_TYPES.has(article.articleType);
}

/** Sections whose articles are always this type. */
export const SECTION_ARTICLE_TYPE: Record<string, 'opinion' | 'analysis'> = {
  opinion: 'opinion',
  analysis: 'analysis',
};
