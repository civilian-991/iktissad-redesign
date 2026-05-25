/**
 * Admin Edit Article Page
 *
 * Thin wrapper around the shared ArticleEditor component.
 * The editor itself is in src/components/admin/ArticleEditor.tsx and is
 * used by /admin/articles/new as well (which creates a draft server-side
 * then redirects here).
 */
import ArticleEditor from '@/components/admin/ArticleEditor';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArticleEditor articleId={id} />;
}
