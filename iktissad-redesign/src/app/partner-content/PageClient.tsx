'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import useSWRInfinite from 'swr/infinite';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SponsoredPill } from '@/components/SponsoredLabel';
import { useTranslation } from '@/lib/i18n';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

/**
 * /partner-content — the separate section where every paid piece lives, as
 * the editorial policy promises ("kept in a section separate from newsroom
 * coverage"). Newsroom feeds exclude these articles; this page lists only them.
 */

const PAGE_SIZE = 12;

function getKey(pageIndex: number, previous: ApiResponse<Article[]> | null) {
  if (previous?.pagination && pageIndex + 1 > previous.pagination.totalPages) return null;
  return `/api/articles?status=published&sponsored=only&pageSize=${PAGE_SIZE}&page=${pageIndex + 1}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function PartnerCard({ article }: { article: Article }) {
  const { t } = useTranslation();
  return (
    <Link
      href={`/${article.slug}`}
      className="group flex flex-col bg-white border border-charcoal/10 overflow-hidden hover:shadow-[0_8px_30px_rgba(24,59,78,0.10)] transition-shadow"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-sand/40">
        {article.featuredImage && (
          // eslint-disable-next-line @next/next/no-img-element -- matches the other listing pages
          <img
            src={article.featuredImage}
            alt={article.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {article.sponsorship && <SponsoredPill sponsorship={article.sponsorship} />}
          {article.sponsor && (
            <span className="text-[12px] font-[family-name:var(--font-display)] text-charcoal/50">
              {t('sponsored.inPartnershipWith')} {article.sponsor.name}
            </span>
          )}
        </div>
        <h2 className="mb-2 line-clamp-3 font-[family-name:var(--font-display)] text-lg font-bold leading-snug text-ink group-hover:text-gold transition-colors">
          {article.title}
        </h2>
        {article.excerpt && <p className="line-clamp-2 text-sm text-charcoal/60">{article.excerpt}</p>}
        {article.publishedAt && (
          <p className="mt-auto pt-4 text-[12px] text-charcoal/40 font-[family-name:var(--font-display)]">
            {formatDate(article.publishedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function PartnerContentPageClient() {
  const { t } = useTranslation();
  const { data, size, setSize, isLoading, isValidating, error } = useSWRInfinite<ApiResponse<Article[]>>(
    getKey,
    swrFetcher
  );

  const articles = (data ?? []).flatMap((p) => p.data ?? []);
  const last = data?.[data.length - 1];
  const hasMore = last?.pagination ? last.pagination.page < last.pagination.totalPages : false;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-paper">
        <section className="border-b border-sand/60 bg-obsidian py-14">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12">
            <h1 className="font-[family-name:var(--font-display)] text-3xl lg:text-5xl font-black text-paper">
              {t('sponsored.pageTitle')}
            </h1>
            <p className="mt-4 max-w-2xl text-paper/65 leading-relaxed">{t('sponsored.pageIntro')}</p>
          </div>
        </section>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12 py-12 grid gap-12 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            {isLoading && (
              <div className="flex justify-center py-24">
                <Loader2 className="text-gold animate-spin" size={32} />
              </div>
            )}
            {error && <p className="py-24 text-center text-charcoal/60">{t('common.errors.general')}</p>}
            {!isLoading && !error && articles.length === 0 && (
              <p className="py-24 text-center text-charcoal/60">{t('sponsored.empty')}</p>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              {articles.map((a) => (
                <PartnerCard key={a.id} article={a} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => setSize(size + 1)}
                  disabled={isValidating}
                  className="flex items-center gap-2 bg-obsidian px-8 py-3 font-[family-name:var(--font-display)] font-semibold text-paper hover:bg-obsidian/90 disabled:opacity-60"
                >
                  {isValidating && <Loader2 size={16} className="animate-spin" />}
                  {t('sponsored.loadMore')}
                </button>
              </div>
            )}
          </div>

          {/* Editorial policy for sponsored content (rate card §8) */}
          <aside className="h-fit border border-gold/30 bg-gold/[0.04] p-5">
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-sm font-black text-ink">
              {t('sponsored.policyTitle')}
            </h2>
            <ul className="space-y-3 text-[13px] leading-relaxed text-charcoal/70">
              <li>{t('sponsored.policyLabeling')}</li>
              <li>{t('sponsored.policyIndependence')}</li>
              <li>{t('sponsored.policyReview')}</li>
              <li>{t('sponsored.policyAccuracy')}</li>
            </ul>
            <Link
              href="/advertise"
              className="mt-5 inline-block text-[13px] font-[family-name:var(--font-display)] font-bold text-gold hover:underline"
            >
              {t('sponsored.advertiseCta')}
            </Link>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
