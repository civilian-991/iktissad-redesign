'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Trash2, Loader2, BookmarkX, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookmarkItem {
  bookmarkId: string;
  bookmarkedAt: string;
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    featuredImage: string;
    publishedAt: string | null;
    section: string;
    sector: string;
    author: { name: string; avatar: string };
  } | null;
}

interface BookmarksResponse {
  data: BookmarkItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Single bookmark card ─────────────────────────────────────────────────────

function BookmarkCard({
  item,
  onRemove,
  removing,
}: {
  item: BookmarkItem;
  onRemove: (bookmarkId: string, articleId: string) => void;
  removing: boolean;
}) {
  const { t } = useTranslation();
  const { article } = item;
  if (!article) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: removing ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-ivory overflow-hidden flex flex-col sm:flex-row"
    >
      {/* Thumbnail */}
      {article.featuredImage && (
        <Link href={`/${article.slug}`} className="sm:w-52 flex-shrink-0 overflow-hidden">
          <div className="h-44 sm:h-full relative">
            <img
              src={article.featuredImage}
              alt={article.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      )}

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1">
          {article.sector && (
            <span className="text-gold text-xs font-bold font-[family-name:var(--font-display)] block mb-1">
              {article.sector}
            </span>
          )}
          <Link href={`/${article.slug}`}>
            <h3 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-base leading-snug hover:text-gold transition-colors line-clamp-2 mb-2">
              {article.title}
            </h3>
          </Link>
          {article.excerpt && (
            <p className="text-pewter text-sm leading-relaxed line-clamp-2 mb-3">
              {article.excerpt}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-ivory">
          <div className="flex items-center gap-3 text-xs text-charcoal/40 font-[family-name:var(--font-display)]">
            <span className="flex items-center gap-1">
              <Bookmark size={11} className="text-gold" />
              {t('pages.account.readOn')} {formatDate(item.bookmarkedAt)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/${article.slug}`}
              className="text-xs font-[family-name:var(--font-display)] font-semibold text-obsidian hover:text-gold transition-colors flex items-center gap-1"
            >
              قراءة
              <ArrowRight size={12} />
            </Link>
            <button
              onClick={() => onRemove(item.bookmarkId, article.id)}
              disabled={removing}
              className="p-1.5 rounded-lg text-charcoal/30 hover:text-loss hover:bg-loss/5 transition-colors disabled:opacity-40"
              title={t('pages.account.removeBookmark')}
              aria-label={t('pages.account.removeBookmark')}
            >
              {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SavedArticlesClient() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const { data, isLoading, mutate } = useSWR<BookmarksResponse>(
    `/api/bookmarks?limit=12&page=${page}`,
    swrFetcher as any
  );

  const bookmarks = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  async function handleRemove(bookmarkId: string, articleId: string) {
    setRemovingIds((prev) => new Set(prev).add(bookmarkId));
    try {
      const res = await fetch(`/api/bookmarks/${articleId}`, { method: 'DELETE' });
      if (res.ok) {
        // Optimistically update local data
        await mutate(
          (current) =>
            current
              ? {
                  ...current,
                  data: current.data.filter((b) => b.bookmarkId !== bookmarkId),
                  pagination: {
                    ...current.pagination,
                    total: current.pagination.total - 1,
                  },
                }
              : current,
          { revalidate: true }
        );
      }
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(bookmarkId);
        return next;
      });
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-paper" dir="rtl">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-obsidian to-navy-light py-14">
          <div className="container-luxury">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-1">
                <Bookmark className="text-gold" size={24} />
                <h1 className="text-3xl font-[family-name:var(--font-display)] font-black text-white">
                  {t('pages.account.saved_articles')}
                </h1>
              </div>
              <p className="text-white/60 text-sm mt-2 mr-9">
                {data?.pagination?.total ?? 0} مقال محفوظ
              </p>
            </motion.div>
          </div>
        </section>

        <div className="container-luxury py-10 max-w-4xl">

          {/* Back link */}
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-xs text-pewter hover:text-gold font-[family-name:var(--font-display)] font-semibold mb-6 transition-colors"
          >
            <ArrowRight size={13} />
            العودة إلى حسابي
          </Link>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="text-gold animate-spin" size={32} />
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-20">
              <BookmarkX className="text-pewter/40 mx-auto mb-4" size={48} />
              <p className="font-[family-name:var(--font-display)] font-bold text-obsidian mb-2">
                {t('pages.account.dashboard.noSaved')}
              </p>
              <p className="text-pewter text-sm mb-6">استعرض المقالات واحفظ ما يهمك</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-white rounded-xl font-[family-name:var(--font-display)] font-bold text-sm hover:bg-gold-dark transition-colors"
              >
                تصفح المقالات
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-5">
                {bookmarks.map((item) => (
                  <BookmarkCard
                    key={item.bookmarkId}
                    item={item}
                    onRemove={handleRemove}
                    removing={removingIds.has(item.bookmarkId)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg border border-ivory text-sm font-[family-name:var(--font-display)] font-semibold text-charcoal hover:border-gold hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('common.actions.previous')}
                  </button>
                  <span className="text-sm text-pewter px-3">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-lg border border-ivory text-sm font-[family-name:var(--font-display)] font-semibold text-charcoal hover:border-gold hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('common.actions.next')}
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}
