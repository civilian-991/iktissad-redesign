'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { User, Clock, BookOpen, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';
import type { PublicAuthor } from '@/app/api/authors/[id]/route';

const PAGE_SIZE = 12;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function roleLabel(
  role: PublicAuthor['role'],
  t: ReturnType<typeof useTranslation>['t']
): string {
  switch (role) {
    case 'editor':
      return t('authors.detail.roles.editor') as string;
    case 'admin':
      return t('authors.detail.roles.admin') as string;
    case 'contributor':
      return t('authors.detail.roles.contributor') as string;
    case 'author':
    default:
      return t('authors.detail.roles.author') as string;
  }
}

function getInitials(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1);
}

function ArticleTile({ article, index }: { article: Article; index: number }) {
  return (
    <motion.a
      href={`/${article.slug ?? article.id}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index % PAGE_SIZE, 11) * 0.05,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group flex flex-col bg-white border border-charcoal/10 overflow-hidden hover:shadow-[0_8px_30px_rgba(24,59,78,0.10)] hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative overflow-hidden" style={{ paddingBottom: '60%' }}>
        {article.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.featuredImage}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy/5 to-navy/15 flex items-center justify-center">
            <span className="text-navy/20 font-[family-name:var(--font-display)] font-black text-4xl select-none">
              اقتصاد
            </span>
          </div>
        )}
        {article.sector && (
          <span className="absolute top-3 end-3 bg-gold text-white text-xs font-bold font-[family-name:var(--font-display)] px-2.5 py-1 leading-none">
            {article.sector}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-base leading-snug line-clamp-2 group-hover:text-navy transition-colors duration-200 mb-2">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-charcoal/60 text-sm leading-relaxed line-clamp-2 font-[family-name:var(--font-display)] mb-auto">
            {article.excerpt}
          </p>
        )}
        {article.publishedAt && (
          <div className="flex items-center gap-1.5 text-charcoal/40 text-xs font-[family-name:var(--font-display)] mt-4 pt-4 border-t border-charcoal/8">
            <Clock size={10} />
            {formatDate(article.publishedAt)}
          </div>
        )}
      </div>
    </motion.a>
  );
}

export default function AuthorDetailPageClient() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const authorId = params?.id;

  // Author info — public endpoint
  const {
    data: authorData,
    isLoading: authorLoading,
    error: authorError,
  } = useSWR<ApiResponse<PublicAuthor>>(
    authorId ? `/api/authors/${authorId}` : null,
    swrFetcher
  );

  const author = authorData?.data;

  // Paginated articles by this author (accumulating)
  const {
    data: articlePages,
    size,
    setSize,
    isLoading: articlesLoading,
    isValidating: articlesValidating,
  } = useSWRInfinite<ApiResponse<Article[]>>(
    (pageIndex, previousPageData) => {
      if (!authorId || !author) return null;
      if (
        previousPageData?.pagination &&
        pageIndex + 1 > previousPageData.pagination.totalPages
      ) {
        return null;
      }
      return `/api/articles?authorId=${authorId}&status=published&pageSize=${PAGE_SIZE}&page=${pageIndex + 1}`;
    },
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const pages = articlePages ?? [];
  const articles = pages.flatMap((p) => p.data ?? []);
  const lastPage = pages[pages.length - 1];
  const hasMore = lastPage?.pagination
    ? lastPage.pagination.page < lastPage.pagination.totalPages
    : false;
  const totalArticles =
    lastPage?.pagination?.total ?? author?.articleCount ?? 0;
  const isLoadingMore = articlesValidating && size > 1;

  // Not-found / error state
  if (!authorLoading && (authorError || !author)) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-cream flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-obsidian mx-auto mb-6 flex items-center justify-center">
              <User size={28} className="text-gold/70" />
            </div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy mb-3">
              {t('authors.detail.notFound.title')}
            </h1>
            <p className="text-charcoal/60 font-[family-name:var(--font-display)] mb-8">
              {t('authors.detail.notFound.description')}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-navy text-white font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-navy/90 transition-colors"
            >
              {t('authors.detail.notFound.backHome')}
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Initial loading
  if (authorLoading || !author) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-cream flex items-center justify-center">
          <Loader2 size={36} className="text-gold animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  const initials = getInitials(author.name);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Cover band */}
        <section className="relative h-[28vh] min-h-[200px] overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
        </section>

        {/* Author card */}
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative -mt-24 mb-12"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-40 h-40 rounded-2xl overflow-hidden shadow-lg border-4 border-white bg-obsidian flex items-center justify-center">
                  {author.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={author.avatar}
                      alt={author.name}
                      className="w-full h-full object-cover"
                    />
                  ) : initials ? (
                    <span className="text-gold text-4xl font-[family-name:var(--font-display)] font-bold">
                      {initials}
                    </span>
                  ) : (
                    <User size={48} className="text-gold" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-start">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                  <span className="px-3 py-1 bg-gold text-white text-xs font-[family-name:var(--font-display)] font-semibold rounded-full">
                    {roleLabel(author.role, t)}
                  </span>
                  <span className="flex items-center gap-1 text-slate text-sm font-[family-name:var(--font-display)]">
                    <BookOpen size={14} />
                    {(t('authors.detail.articleCount') as string).replace(
                      '{count}',
                      String(totalArticles)
                    )}
                  </span>
                </div>

                <h1 className="text-3xl lg:text-4xl font-[family-name:var(--font-display)] font-black text-navy mb-2">
                  {author.name}
                </h1>
                <p className="text-base text-charcoal/60 font-[family-name:var(--font-display)]">
                  {t('authors.detail.tagline')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Articles */}
        <section className="pb-16">
          <div className="container-luxury">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-sand">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy flex items-center gap-2">
                <BookOpen size={22} className="text-gold" />
                {t('authors.detail.articlesHeading')}
              </h2>
            </div>

            {articlesLoading && articles.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 size={30} className="text-gold animate-spin" />
              </div>
            ) : articles.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <BookOpen size={28} className="text-charcoal/20" />
                <p className="text-charcoal/50 font-[family-name:var(--font-display)]">
                  {t('authors.detail.empty')}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {articles.map((article, i) => (
                    <ArticleTile key={article.id} article={article} index={i} />
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-10">
                    <button
                      onClick={() => setSize(size + 1)}
                      disabled={isLoadingMore}
                      className="flex items-center gap-2 px-10 py-3.5 bg-navy text-white font-[family-name:var(--font-display)] font-semibold text-sm tracking-wide hover:bg-navy/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          {t('common.actions.loadingMore')}
                        </>
                      ) : (
                        t('common.actions.loadMore')
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
