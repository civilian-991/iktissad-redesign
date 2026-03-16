'use client';

import { use } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  Eye,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Link2,
  ChevronRight,
  Tag,
  User,
  Calendar,
  ArrowUpLeft,
  Loader2
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

export default function ArticlePageClient({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslation();
  const { id } = use(params);

  const { data, error, isLoading } = useSWR<ApiResponse<Article>>(
    id ? `/api/articles/${id}` : null,
    swrFetcher
  );

  // Fetch related articles from same section
  const article = data?.data;
  const { data: relatedData } = useSWR<ApiResponse<Article[]>>(
    article?.section
      ? `/api/articles?section=${article.section}&status=published&pageSize=4`
      : null,
    swrFetcher
  );
  const relatedArticles = (relatedData?.data ?? []).filter(a => a.id !== article?.id).slice(0, 3);

  const handleShare = (platform: string) => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const text = article?.title ?? '';

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      return;
    }

    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
    };

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-cream flex items-center justify-center">
          <Loader2 className="text-gold animate-spin" size={48} />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !article) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy">
            المقال غير موجود
          </h1>
          <a href="/" className="text-gold hover:underline font-[family-name:var(--font-display)]">
            العودة إلى الرئيسية
          </a>
        </main>
        <Footer />
      </>
    );
  }

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Image */}
        <div className="relative h-[50vh] lg:h-[60vh] overflow-hidden">
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            {article.featuredImage ? (
              <img
                src={article.featuredImage}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-navy to-navy-light" />
            )}
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/50 to-transparent" />

          {/* Breadcrumb */}
          <div className="absolute top-8 right-0 left-0">
            <div className="container-luxury">
              <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-white/70 text-sm font-[family-name:var(--font-display)]"
              >
                <a href="/" className="hover:text-gold transition-colors">{t('components.breadcrumb.home')}</a>
                {article.sector && (
                  <>
                    <ChevronRight size={14} />
                    <a href={`/sectors/${article.sector}`} className="hover:text-gold transition-colors">{article.sector}</a>
                  </>
                )}
                <ChevronRight size={14} />
                <span className="text-white/50 truncate max-w-[200px]">{article.title}</span>
              </motion.nav>
            </div>
          </div>

          {/* Title Overlay */}
          <div className="absolute bottom-0 right-0 left-0 pb-12">
            <div className="container-luxury">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {article.sector && (
                  <span className="news-tag mb-4">{article.sector}</span>
                )}
                <h1 className="text-3xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white leading-tight max-w-4xl">
                  {article.title}
                </h1>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="container-luxury py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Meta Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-6 mb-8 pb-8 border-b border-sand"
              >
                {article.author?.name && (
                  <span className="flex items-center gap-2 text-slate text-sm">
                    <User size={16} className="text-gold" />
                    {article.author.name}
                  </span>
                )}
                {publishedDate && (
                  <span className="flex items-center gap-2 text-slate text-sm">
                    <Calendar size={16} className="text-gold" />
                    {publishedDate}
                  </span>
                )}
                {article.views > 0 && (
                  <span className="flex items-center gap-2 text-slate text-sm">
                    <Eye size={16} className="text-gold" />
                    {article.views.toLocaleString()}
                  </span>
                )}
              </motion.div>

              {/* Excerpt */}
              {article.excerpt && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl text-navy leading-relaxed mb-8 font-semibold"
                >
                  {article.excerpt}
                </motion.p>
              )}

              {/* Article Body */}
              {article.content && (
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="prose prose-lg max-w-none
                    prose-headings:font-[family-name:var(--font-display)] prose-headings:text-navy prose-headings:font-bold
                    prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                    prose-p:text-charcoal prose-p:leading-relaxed prose-p:mb-6
                    prose-blockquote:border-r-4 prose-blockquote:border-gold prose-blockquote:pr-6 prose-blockquote:py-4 prose-blockquote:bg-ivory prose-blockquote:rounded-lg prose-blockquote:italic prose-blockquote:text-navy
                    prose-ul:list-disc prose-ul:pr-6 prose-li:text-charcoal prose-li:mb-2
                    prose-a:text-gold prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              )}

              {/* Tags */}
              {article.tags?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-wrap items-center gap-3 mt-10 pt-8 border-t border-sand"
                >
                  <Tag size={18} className="text-gold" />
                  {article.tags.map((tag) => (
                    <a
                      key={tag}
                      href={`/search?q=${encodeURIComponent(tag)}`}
                      className="px-4 py-2 bg-ivory rounded-full text-sm font-[family-name:var(--font-display)] text-navy hover:bg-gold hover:text-white transition-colors"
                    >
                      {tag}
                    </a>
                  ))}
                </motion.div>
              )}

              {/* Share Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center gap-4 mt-8"
              >
                <span className="flex items-center gap-2 text-navy font-[family-name:var(--font-display)] font-semibold">
                  <Share2 size={18} />
                  {t('components.share.title')}:
                </span>
                <button
                  onClick={() => handleShare('facebook')}
                  className="w-10 h-10 rounded-full bg-[#1877f2] text-white flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <Facebook size={18} />
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="w-10 h-10 rounded-full bg-[#1da1f2] text-white flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <Twitter size={18} />
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="w-10 h-10 rounded-full bg-[#0a66c2] text-white flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <Linkedin size={18} />
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="w-10 h-10 rounded-full bg-slate text-white flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <Link2 size={18} />
                </button>
              </motion.div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl shadow-lg p-6 sticky top-24"
              >
                <h3 className="font-[family-name:var(--font-display)] font-bold text-xl text-navy mb-6 pb-4 border-b border-sand">
                  {t('pages.news.relatedArticles')}
                </h3>

                {relatedArticles.length === 0 ? (
                  <p className="text-slate text-sm">لا توجد مقالات ذات صلة.</p>
                ) : (
                  <div className="space-y-4">
                    {relatedArticles.map((related, index) => (
                      <motion.a
                        key={related.id}
                        href={`/news/${related.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex gap-4 group"
                      >
                        {related.featuredImage && (
                          <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={related.featuredImage}
                              alt={related.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {related.sector && (
                            <span className="text-xs text-gold font-[family-name:var(--font-display)] font-semibold">
                              {related.sector}
                            </span>
                          )}
                          <h4 className="font-[family-name:var(--font-display)] font-semibold text-sm text-navy leading-snug line-clamp-2 group-hover:text-gold transition-colors">
                            {related.title}
                          </h4>
                          {related.publishedAt && (
                            <span className="text-xs text-slate mt-1 flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(related.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                            </span>
                          )}
                        </div>
                      </motion.a>
                    ))}
                  </div>
                )}

                {article.sector && (
                  <a
                    href={`/sectors/${article.sector}`}
                    className="flex items-center justify-center gap-2 w-full mt-6 py-3 rounded-lg border-2 border-dashed border-gold/30 text-gold font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/10 transition-colors"
                  >
                    المزيد من {article.sector}
                    <ArrowUpLeft size={16} />
                  </a>
                )}
              </motion.div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
