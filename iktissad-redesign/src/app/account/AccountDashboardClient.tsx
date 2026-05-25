'use client';

import { motion } from 'motion/react';
import {
  Crown,
  Bookmark,
  BookOpen,
  CreditCard,
  Clock,
  ArrowUpLeft,
  Loader2,
  User,
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

// ─── Local types ──────────────────────────────────────────────────────────────

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

interface HistoryItem {
  sessionId: string;
  readAt: string;
  article: {
    id: string;
    title: string;
    slug: string;
    featuredImage: string;
    publishedAt: string | null;
    section: string;
    sector: string;
  } | null;
}

interface SubscriptionData {
  id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'incomplete';
  current_period_end: string | null;
  subscription_plans: { name_ar: string } | null;
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

// ─── Quick link card ──────────────────────────────────────────────────────────

function QuickLinkCard({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-ivory hover:border-gold/40 hover:shadow-md transition-all group"
    >
      <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0 group-hover:bg-gold/20 transition-colors">
        {icon}
      </div>
      <div>
        <p className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm group-hover:text-gold transition-colors">
          {label}
        </p>
        <p className="text-pewter text-xs mt-0.5">{description}</p>
      </div>
      <ArrowUpLeft className="text-pewter group-hover:text-gold transition-colors ms-auto flex-shrink-0" size={16} />
    </Link>
  );
}

// ─── Mini article card ────────────────────────────────────────────────────────

function MiniArticleCard({
  title,
  slug,
  featuredImage,
  sector,
  date,
}: {
  title: string;
  slug: string;
  featuredImage: string;
  sector: string;
  date: string | null;
}) {
  return (
    <Link
      href={`/${slug}`}
      className="flex items-start gap-3 group hover:bg-ivory/60 p-2 -mx-2 rounded-lg transition-colors"
    >
      {featuredImage && (
        <div className="w-16 h-12 flex-shrink-0 overflow-hidden rounded-md">
          <img
            src={featuredImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {sector && (
          <span className="text-gold text-[10px] font-bold font-[family-name:var(--font-display)] block mb-0.5">
            {sector}
          </span>
        )}
        <p className="font-[family-name:var(--font-display)] font-semibold text-obsidian text-xs leading-snug line-clamp-2 group-hover:text-gold transition-colors">
          {title}
        </p>
        {date && (
          <span className="text-charcoal/40 text-[10px] flex items-center gap-1 mt-1">
            <Clock size={9} />
            {formatDate(date)}
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Subscription status badge ────────────────────────────────────────────────

function SubscriptionStatusCard({ subscriber }: { subscriber: SubscriptionData | null }) {
  const { t } = useTranslation();

  const statusMap: Record<string, { label: string; cls: string }> = {
    active: { label: 'نشط', cls: 'text-profit bg-profit/10' },
    trialing: { label: 'تجريبي', cls: 'text-brand bg-brand-50' },
    past_due: { label: 'متأخر السداد', cls: 'text-loss bg-loss/10' },
    canceled: { label: 'ملغى', cls: 'text-charcoal bg-slate-100' },
    paused: { label: 'موقوف', cls: 'text-gold-dark bg-gold/10' },
    incomplete: { label: 'غير مكتمل', cls: 'text-pewter bg-slate-100' },
  };

  if (!subscriber) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-ivory p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Crown className="text-pewter" size={20} />
          </div>
          <div>
            <p className="text-xs text-pewter mb-0.5">{t('pages.account.subscription.title')}</p>
            <p className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm">
              {t('pages.account.subscription.noSubscription')}
            </p>
          </div>
        </div>
        <Link
          href="/subscribe"
          className="text-xs font-[family-name:var(--font-display)] font-bold px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors flex-shrink-0"
        >
          {t('common.actions.subscribe')}
        </Link>
      </div>
    );
  }

  const { label, cls } = statusMap[subscriber.status] ?? { label: subscriber.status, cls: 'text-pewter bg-slate-100' };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-ivory p-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
          <Crown className="text-gold" size={20} />
        </div>
        <div>
          <p className="text-xs text-pewter mb-0.5">{t('pages.account.subscription.currentPlan')}</p>
          <p className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm">
            {subscriber.subscription_plans?.name_ar ?? 'اشتراك نشط'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {subscriber.current_period_end && (
          <div className="text-end hidden sm:block">
            <p className="text-[10px] text-pewter">{t('pages.account.subscription.nextBilling')}</p>
            <p className="text-xs font-semibold text-charcoal">{formatDate(subscriber.current_period_end)}</p>
          </div>
        )}
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  userId: string;
  userEmail: string;
}

export default function AccountDashboardClient({ userId: _userId, userEmail }: Props) {
  const { t } = useTranslation();

  const { data: bookmarksData, isLoading: bookmarksLoading } = useSWR<ApiResponse<BookmarkItem[]>>(
    '/api/bookmarks?limit=4',
    swrFetcher as any
  );

  const { data: historyData, isLoading: historyLoading } = useSWR<ApiResponse<HistoryItem[]>>(
    '/api/account/reading-history?pageSize=10',
    swrFetcher as any
  );

  const { data: subRaw } = useSWR<{ data: SubscriptionData | null }>(
    '/api/account/subscription',
    swrFetcher as any
  );

  const bookmarks = bookmarksData?.data ?? [];
  const history = historyData?.data ?? [];
  const subscriber = subRaw?.data ?? null;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-paper" dir="rtl">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-obsidian to-navy-light py-16">
          <div className="container-luxury">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <User className="text-gold" size={22} />
                </div>
                <div>
                  <h1 className="text-2xl font-[family-name:var(--font-display)] font-black text-white">
                    {t('pages.account.dashboard.title')}
                  </h1>
                  <p className="text-white/60 text-sm">{userEmail}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="container-luxury py-10 space-y-8 max-w-5xl">

          {/* ── Subscription Status Card ─────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <SubscriptionStatusCard subscriber={subscriber} />
          </motion.div>

          {/* ── Two-column grid ──────────────────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-8">

            {/* ── Saved Articles ──────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-ivory overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-ivory">
                <h2 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm flex items-center gap-2">
                  <Bookmark className="text-gold" size={16} />
                  {t('pages.account.dashboard.recentSaved')}
                </h2>
                <Link
                  href="/account/saved"
                  className="text-xs text-gold font-[family-name:var(--font-display)] font-semibold hover:underline flex items-center gap-1"
                >
                  {t('pages.account.dashboard.viewAllSaved')}
                  <ArrowUpLeft size={11} />
                </Link>
              </div>

              <div className="p-5 space-y-3">
                {bookmarksLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="text-gold animate-spin" size={22} />
                  </div>
                ) : bookmarks.length === 0 ? (
                  <p className="text-pewter text-xs text-center py-6">
                    {t('pages.account.dashboard.noSaved')}
                  </p>
                ) : (
                  bookmarks.map((b) =>
                    b.article ? (
                      <MiniArticleCard
                        key={b.bookmarkId}
                        title={b.article.title}
                        slug={b.article.slug}
                        featuredImage={b.article.featuredImage}
                        sector={b.article.sector}
                        date={b.bookmarkedAt}
                      />
                    ) : null
                  )
                )}
              </div>
            </motion.div>

            {/* ── Reading History ─────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-ivory overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-ivory">
                <h2 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm flex items-center gap-2">
                  <BookOpen className="text-gold" size={16} />
                  {t('pages.account.dashboard.recentHistory')}
                </h2>
                <Link
                  href="/account/reading-history"
                  className="text-xs text-gold font-[family-name:var(--font-display)] font-semibold hover:underline flex items-center gap-1"
                >
                  {t('pages.account.dashboard.viewAllHistory')}
                  <ArrowUpLeft size={11} />
                </Link>
              </div>

              <div className="p-5 space-y-3">
                {historyLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="text-gold animate-spin" size={22} />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-pewter text-xs text-center py-6">
                    {t('pages.account.dashboard.noHistory')}
                  </p>
                ) : (
                  history.slice(0, 6).map((h) =>
                    h.article ? (
                      <MiniArticleCard
                        key={h.sessionId}
                        title={h.article.title}
                        slug={h.article.slug}
                        featuredImage={h.article.featuredImage}
                        sector={h.article.sector}
                        date={h.readAt}
                      />
                    ) : null
                  )
                )}
              </div>
            </motion.div>
          </div>

          {/* ── Quick Links ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-gold rounded-full" />
              {t('pages.account.dashboard.quickLinks')}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <QuickLinkCard
                href="/account/subscription"
                icon={<CreditCard className="text-gold" size={20} />}
                label={t('pages.account.subscription.title')}
                description="إدارة خطة اشتراكك والمدفوعات"
              />
              <QuickLinkCard
                href="/account/saved"
                icon={<Bookmark className="text-gold" size={20} />}
                label={t('pages.account.saved_articles')}
                description="جميع المقالات التي حفظتها"
              />
              <QuickLinkCard
                href="/account/reading-history"
                icon={<BookOpen className="text-gold" size={20} />}
                label={t('pages.account.reading_history')}
                description="المقالات التي قرأتها مؤخراً"
              />
            </div>
          </motion.div>

        </div>
      </main>

      <Footer />
    </>
  );
}
