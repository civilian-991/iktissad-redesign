'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Clock, Loader2, BookOpenCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryItem {
  sessionId: string;
  readAt: string;
  timeOnPage: number;
  scrollDepth: number;
  readThrough: boolean;
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

interface HistoryResponse {
  data: HistoryItem[];
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
  return new Date(dateStr).toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ar-SA-u-ca-gregory', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMinutes(seconds: number) {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return 'أقل من دقيقة';
  return `${mins} دقيقة`;
}

// ─── Single history card ──────────────────────────────────────────────────────

function HistoryCard({ item }: { item: HistoryItem }) {
  const { article } = item;
  if (!article) return null;

  const scrollPct = Math.round((item.scrollDepth ?? 0) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-ivory overflow-hidden flex gap-0"
    >
      {/* Left accent bar showing scroll depth */}
      <div
        className="w-1 flex-shrink-0 bg-gradient-to-b from-gold to-gold/20"
        style={{ opacity: 0.3 + (item.scrollDepth ?? 0) * 0.7 }}
      />

      {/* Thumbnail */}
      {article.featuredImage && (
        <Link
          href={`/${article.slug}`}
          className="w-28 sm:w-36 flex-shrink-0 overflow-hidden"
        >
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            style={{ minHeight: '80px' }}
          />
        </Link>
      )}

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        <div className="flex-1">
          {article.sector && (
            <span className="text-gold text-[10px] font-bold font-[family-name:var(--font-display)] block mb-1">
              {article.sector}
            </span>
          )}
          <Link href={`/${article.slug}`}>
            <h3 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm leading-snug hover:text-gold transition-colors line-clamp-2 mb-2">
              {article.title}
            </h3>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
          <span className="flex items-center gap-1 text-[11px] text-charcoal/40 font-[family-name:var(--font-display)]">
            <Clock size={10} />
            {formatDate(item.readAt)} — {formatTime(item.readAt)}
          </span>
          {item.timeOnPage > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-charcoal/40 font-[family-name:var(--font-display)]">
              <BookOpen size={10} />
              {formatMinutes(item.timeOnPage)}
            </span>
          )}
          {scrollPct > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-charcoal/40 font-[family-name:var(--font-display)]">
              <div className="w-12 h-1 bg-ivory rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full"
                  style={{ width: `${scrollPct}%` }}
                />
              </div>
              {scrollPct}%
            </span>
          )}
          {item.readThrough && (
            <span className="flex items-center gap-1 text-[11px] text-profit font-[family-name:var(--font-display)] font-semibold">
              <BookOpenCheck size={10} />
              أتممت القراءة
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReadingHistoryClient() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR<HistoryResponse>(
    `/api/account/reading-history?pageSize=15&page=${page}`,
    swrFetcher as any
  );

  const history = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-paper" dir="rtl">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-obsidian to-navy-light py-14">
          <div className="container-luxury">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-1">
                <BookOpen className="text-gold" size={24} />
                <h1 className="text-3xl font-[family-name:var(--font-display)] font-black text-white">
                  {t('pages.account.reading_history')}
                </h1>
              </div>
              <p className="text-white/60 text-sm mt-2 mr-9">
                {data?.pagination?.total ?? 0} جلسة قراءة
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
          ) : history.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="text-pewter/40 mx-auto mb-4" size={48} />
              <p className="font-[family-name:var(--font-display)] font-bold text-obsidian mb-2">
                {t('pages.account.dashboard.noHistory')}
              </p>
              <p className="text-pewter text-sm mb-6">
                ابدأ القراءة وسيظهر سجل مقالاتك هنا
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-white rounded-xl font-[family-name:var(--font-display)] font-bold text-sm hover:bg-gold-dark transition-colors"
              >
                تصفح المقالات
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {history.map((item) => (
                  <HistoryCard key={item.sessionId} item={item} />
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
