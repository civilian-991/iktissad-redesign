/**
 * Content Archival Utility
 *
 * Marks articles older than a configurable threshold as archived.
 * Archived articles remain accessible but are excluded from main feeds and search.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface ArchivalResult {
  archivedCount: number;
  threshold: string;
  oldestArchived: string | null;
}

/**
 * Archive articles older than `thresholdDays` (default: 730 = 2 years).
 * Only archives published articles that are not already archived.
 */
export async function archiveOldArticles(
  thresholdDays: number = 730
): Promise<ArchivalResult> {
  const admin = createAdminClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);
  const cutoffIso = cutoffDate.toISOString();

  // Find articles to archive
  const { data: candidates, error: selectError } = await (admin as any)
    .from('articles')
    .select('id, published_at')
    .eq('status', 'published')
    .eq('archived', false)
    .lt('published_at', cutoffIso)
    .order('published_at', { ascending: true })
    .limit(500);

  if (selectError || !candidates || candidates.length === 0) {
    return {
      archivedCount: 0,
      threshold: cutoffIso,
      oldestArchived: null,
    };
  }

  const articleIds = candidates.map((a: { id: string }) => a.id);

  // Batch update
  const { error: updateError } = await (admin as any)
    .from('articles')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
    })
    .in('id', articleIds);

  if (updateError) {
    throw new Error(`Archival update failed: ${updateError.message}`);
  }

  return {
    archivedCount: articleIds.length,
    threshold: cutoffIso,
    oldestArchived: candidates[0]?.published_at ?? null,
  };
}

/**
 * Un-archive a specific article (admin override).
 */
export async function unarchiveArticle(articleId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await (admin as any)
    .from('articles')
    .update({
      archived: false,
      archived_at: null,
    })
    .eq('id', articleId);

  return !error;
}
