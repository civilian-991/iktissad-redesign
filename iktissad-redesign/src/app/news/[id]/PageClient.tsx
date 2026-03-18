'use client';

import React, { use, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  Eye,
  Facebook,
  Twitter,
  Linkedin,
  Link2,
  Tag,
  User,
  BookOpen,
  Check,
  ArrowLeft,
  Loader2,
  ChevronLeft,
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
  const [copied, setCopied] = useState(false);
  const [readTime, setReadTime] = useState(0);

  const { data, error, isLoading } = useSWR<ApiResponse<Article>>(
    id ? `/api/articles/${id}` : null,
    swrFetcher
  );

  const article = data?.data;

  const { data: relatedData } = useSWR<ApiResponse<Article[]>>(
    article?.section
      ? `/api/articles?section=${article.section}&status=published&pageSize=4`
      : null,
    swrFetcher
  );
  const relatedArticles = (relatedData?.data ?? []).filter(a => a.id !== article?.id).slice(0, 3);

  useEffect(() => {
    if (article?.content) {
      const words = article.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
      setReadTime(Math.ceil(words / 200));
    }
  }, [article?.content]);

  const handleShare = (platform: string) => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const text = article?.title ?? '';
    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        <main className="min-h-screen bg-paper flex items-center justify-center">
          <Loader2 className="text-gold animate-spin" size={28} />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !article) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4">
          <h1 className="text-xl font-[family-name:var(--font-display)] font-bold text-obsidian">المقال غير موجود</h1>
          <a href="/" className="text-sm text-gold hover:underline font-[family-name:var(--font-display)]">العودة إلى الرئيسية</a>
        </main>
        <Footer />
      </>
    );
  }

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  return (
    <>
      <ReadingProgressBar />
      <Header />

      <main className="bg-paper min-h-screen">
        <div className="max-w-[1160px] mx-auto px-6 sm:px-10 lg:px-14">

          {/* ── Section / Breadcrumb bar ── */}
          <div className="border-b border-sand py-3 flex items-center justify-between">
            <nav className="flex items-center gap-1.5 text-[11px] font-[family-name:var(--font-display)] text-charcoal/45">
              <a href="/" className="hover:text-gold transition-colors">{t('components.breadcrumb.home')}</a>
              {article.section && (
                <>
                  <ChevronLeft size={9} />
                  <a href={`/sections/${article.section}`} className="hover:text-gold transition-colors">{article.section}</a>
                </>
              )}
              {article.sector && (
                <>
                  <ChevronLeft size={9} />
                  <span className="text-charcoal/30 truncate max-w-[180px]">{article.sector}</span>
                </>
              )}
            </nav>
            {publishedDate && (
              <span className="text-[11px] font-[family-name:var(--font-display)] text-charcoal/35 hidden sm:block">
                {publishedDate}
              </span>
            )}
          </div>

          {/* ── Article Header: split layout ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="py-10 lg:py-12"
          >
            <div className={`flex flex-col ${article.featuredImage ? 'lg:flex-row-reverse' : ''} gap-10 lg:gap-14 items-start`}>

              {/* Text side */}
              <div className="flex-1 min-w-0">
                {/* Category badges */}
                <div className="flex items-center gap-2.5 mb-5">
                  {article.sector && (
                    <a
                      href={`/sectors/${article.sector}`}
                      className="text-[10px] font-[family-name:var(--font-display)] font-black text-obsidian bg-gold px-3 py-1 tracking-widest uppercase"
                    >
                      {article.sector}
                    </a>
                  )}
                  {article.section && (
                    <a
                      href={`/sections/${article.section}`}
                      className="text-[10px] font-[family-name:var(--font-display)] text-charcoal/50 border border-sand px-3 py-1 hover:border-obsidian/30 transition-colors"
                    >
                      {article.section}
                    </a>
                  )}
                </div>

                {/* Title */}
                <h1
                  className="font-[family-name:var(--font-display)] font-black text-obsidian mb-5 leading-snug"
                  style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1.3 }}
                >
                  {article.title}
                </h1>

                {/* Gold accent rule */}
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-[2px] w-12 bg-gold flex-shrink-0" />
                  <div className="h-px flex-1 bg-sand" />
                </div>

                {/* Excerpt */}
                {article.excerpt && (
                  <p
                    className="font-[family-name:var(--font-display)] font-medium text-charcoal/75 mb-7 leading-loose"
                    style={{ fontSize: '1.05rem', lineHeight: 1.9 }}
                  >
                    {article.excerpt}
                  </p>
                )}

                {/* Meta strip */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-5 border-t border-sand/70">
                  {article.author?.name && (
                    <span className="flex items-center gap-2 font-[family-name:var(--font-display)]">
                      <div className="w-6 h-6 rounded-full bg-obsidian/8 border border-sand flex items-center justify-center flex-shrink-0">
                        <User size={10} className="text-charcoal/50" />
                      </div>
                      <span className="text-sm font-semibold text-obsidian">{article.author.name}</span>
                    </span>
                  )}
                  {article.views > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-[family-name:var(--font-display)] text-charcoal/45">
                      <Eye size={11} className="text-gold" />
                      {article.views.toLocaleString('ar-SA')} مشاهدة
                    </span>
                  )}
                  {readTime > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-[family-name:var(--font-display)] text-charcoal/45">
                      <BookOpen size={11} className="text-gold" />
                      {readTime} دقائق للقراءة
                    </span>
                  )}
                </div>

                {/* Share row */}
                <div className="flex items-center gap-3 mt-5">
                  <span className="text-[10px] font-[family-name:var(--font-display)] font-black text-charcoal/30 uppercase tracking-widest">
                    مشاركة
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { p: 'facebook', icon: <Facebook size={11} />, color: '#1877f2' },
                      { p: 'twitter', icon: <Twitter size={11} />, color: '#0f1419' },
                      { p: 'linkedin', icon: <Linkedin size={11} />, color: '#0a66c2' },
                    ].map(({ p, icon, color }) => (
                      <button
                        key={p}
                        onClick={() => handleShare(p)}
                        className="w-7 h-7 flex items-center justify-center text-white transition-opacity hover:opacity-80"
                        style={{ backgroundColor: color }}
                      >
                        {icon}
                      </button>
                    ))}
                    <button
                      onClick={() => handleShare('copy')}
                      className={`w-7 h-7 border flex items-center justify-center transition-all ${
                        copied
                          ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
                          : 'border-sand text-charcoal/40 hover:border-obsidian hover:text-obsidian'
                      }`}
                    >
                      {copied ? <Check size={11} /> : <Link2 size={11} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Image side */}
              {article.featuredImage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.6 }}
                  className="w-full lg:w-[420px] flex-shrink-0"
                >
                  <div className="relative overflow-hidden border border-sand/80" style={{ aspectRatio: '4/3' }}>
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Subtle vignette */}
                    <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(24,59,78,0.08)] pointer-events-none" />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* ── Full-width rule ── */}
          <div className="relative mb-10">
            <div className="h-px bg-sand" />
            <div className="absolute right-0 top-0 h-[2px] w-16 bg-gold -translate-y-[0.5px]" />
          </div>

          {/* ── Article body + Sidebar ── */}
          <div className="grid lg:grid-cols-[1fr_288px] gap-14 items-start pb-20">

            {/* Article body */}
            <motion.article
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div
                className="article-body-new"
                dangerouslySetInnerHTML={{ __html: article.content ?? '' }}
              />

              {/* Tags */}
              {article.tags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-14 pt-8 border-t border-sand">
                  <span className="flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-display)] font-black text-gold uppercase tracking-widest ml-2">
                    <Tag size={11} /> الوسوم
                  </span>
                  {article.tags.map((tag) => (
                    <a
                      key={tag}
                      href={`/search?q=${encodeURIComponent(tag)}`}
                      className="px-3 py-1.5 text-[11px] font-[family-name:var(--font-display)] text-charcoal/55 border border-sand hover:border-obsidian/40 hover:text-obsidian transition-all"
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              )}
            </motion.article>

            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
            >
              <div className="sticky top-24 space-y-5">

                {/* Related articles */}
                <div className="border border-sand overflow-hidden">
                  <div className="bg-obsidian px-4 py-3 flex items-center gap-2.5">
                    <div className="w-px h-4 bg-gold" />
                    <h3 className="text-[12px] font-[family-name:var(--font-display)] font-bold text-paper tracking-wide">
                      {t('pages.news.relatedArticles')}
                    </h3>
                  </div>

                  {relatedArticles.length === 0 ? (
                    <p className="text-charcoal/35 text-xs font-[family-name:var(--font-display)] py-8 text-center">
                      لا توجد مقالات ذات صلة
                    </p>
                  ) : (
                    <div className="divide-y divide-sand/50">
                      {relatedArticles.map((related, i) => (
                        <a
                          key={related.id}
                          href={`/news/${related.id}`}
                          className="flex gap-3 p-3.5 hover:bg-cream/50 transition-colors group"
                        >
                          {related.featuredImage ? (
                            <div className="w-16 h-[52px] flex-shrink-0 overflow-hidden border border-sand/60">
                              <img
                                src={related.featuredImage}
                                alt={related.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-[52px] flex-shrink-0 bg-obsidian/[0.04] border border-sand/60 flex items-center justify-center">
                              <BookOpen size={12} className="text-charcoal/20" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {related.sector && (
                              <span className="text-[9px] font-[family-name:var(--font-display)] font-black text-gold uppercase tracking-widest block mb-0.5">
                                {related.sector}
                              </span>
                            )}
                            <h4 className="text-[11.5px] font-[family-name:var(--font-display)] font-semibold text-obsidian leading-snug line-clamp-3 group-hover:text-gold transition-colors">
                              {related.title}
                            </h4>
                            {related.publishedAt && (
                              <span className="flex items-center gap-1 text-[9px] text-charcoal/30 mt-1.5">
                                <Clock size={8} />
                                {new Date(related.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {article.sector && (
                    <div className="border-t border-sand/60 p-3">
                      <a
                        href={`/sectors/${article.sector}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 text-[11px] font-[family-name:var(--font-display)] font-bold text-obsidian/60 border border-obsidian/12 hover:bg-obsidian hover:text-gold hover:border-obsidian transition-all group"
                      >
                        المزيد من {article.sector}
                        <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Newsletter widget */}
                <div className="relative overflow-hidden bg-obsidian p-5">
                  <div
                    className="absolute inset-0 opacity-[0.05] pointer-events-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23DDA853' stroke-width='0.5'%3E%3Cpath d='M40 0L55 25L80 40L55 55L40 80L25 55L0 40L25 25Z'/%3E%3Ccircle cx='40' cy='40' r='12'/%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  />
                  <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
                  <div className="relative">
                    <p className="text-[9px] font-[family-name:var(--font-display)] font-black text-gold uppercase tracking-[0.22em] mb-2">
                      النشرة الإخبارية
                    </p>
                    <p className="text-[12px] font-[family-name:var(--font-display)] text-paper/55 mb-4 leading-relaxed">
                      أحدث التحليلات الاقتصادية مباشرة إلى بريدك
                    </p>
                    <input
                      type="email"
                      placeholder="بريدك الإلكتروني"
                      className="w-full bg-white/[0.06] border border-white/10 text-paper placeholder:text-paper/25 px-3 py-2 text-[12px] font-[family-name:var(--font-display)] mb-2.5 focus:outline-none focus:border-gold/40 transition-colors"
                      dir="ltr"
                    />
                    <button className="w-full bg-gold text-obsidian py-2 text-[11px] font-[family-name:var(--font-display)] font-black tracking-wide hover:bg-gold-bright transition-colors">
                      اشتراك
                    </button>
                  </div>
                </div>

              </div>
            </motion.aside>

          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        .article-body-new {
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: 1.055rem;
          line-height: 2.05;
          color: #1E4A60;
        }
        .article-body-new > p:first-of-type::first-letter {
          font-family: var(--font-display), system-ui, sans-serif;
          font-size: 3.5rem;
          font-weight: 900;
          color: #DDA853;
          float: right;
          line-height: 0.82;
          margin-left: 0.12em;
          margin-bottom: -0.08em;
          margin-top: 0.08em;
        }
        .article-body-new p { margin-bottom: 1.6rem; }
        .article-body-new h2 {
          font-family: var(--font-display), system-ui, sans-serif;
          font-size: 1.3rem;
          font-weight: 800;
          color: #0C1E2A;
          margin-top: 2.75rem;
          margin-bottom: 1.1rem;
          padding-right: 1rem;
          border-right: 3px solid #DDA853;
          line-height: 1.42;
        }
        .article-body-new h3 {
          font-family: var(--font-display), system-ui, sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #183B4E;
          margin-top: 2.25rem;
          margin-bottom: 0.875rem;
          line-height: 1.5;
        }
        .article-body-new blockquote {
          border-right: 3px solid #DDA853;
          border-top: 1px solid rgba(221,168,83,0.18);
          border-bottom: 1px solid rgba(221,168,83,0.18);
          padding: 1.25rem 1.4rem;
          margin: 2.25rem 0;
          background: rgba(221,168,83,0.032);
        }
        .article-body-new blockquote p {
          font-size: 1.05rem;
          font-weight: 600;
          color: #183B4E;
          margin-bottom: 0;
          font-family: var(--font-display), system-ui, sans-serif;
          line-height: 1.85;
          font-style: italic;
        }
        .article-body-new ul, .article-body-new ol {
          padding-right: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .article-body-new li { margin-bottom: 0.55rem; line-height: 1.9; }
        .article-body-new ul li::marker { color: #DDA853; }
        .article-body-new a {
          color: #C49240;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: rgba(196,146,64,0.3);
        }
        .article-body-new a:hover { color: #DDA853; text-decoration-color: #DDA853; }
        .article-body-new strong { font-weight: 700; color: #0C1E2A; }
        .article-body-new em { color: #275A73; }
        .article-body-new img {
          max-width: 100%;
          height: auto;
          margin: 2rem 0;
          border: 1px solid #E8E0D0;
          display: block;
        }
        .article-body-new figure { margin: 2rem 0; }
        .article-body-new figcaption {
          font-size: 0.8rem;
          color: #548490;
          font-family: var(--font-display), system-ui, sans-serif;
          margin-top: 0.5rem;
          text-align: center;
        }
        .article-body-new table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.9rem; }
        .article-body-new th {
          background: #183B4E;
          color: #F5EEDC;
          padding: 0.65rem 1rem;
          font-family: var(--font-display), system-ui, sans-serif;
          font-weight: 700;
          text-align: right;
        }
        .article-body-new td { padding: 0.6rem 1rem; border-bottom: 1px solid #E8E0D0; color: #2A5A6E; }
        .article-body-new tr:nth-child(even) td { background: rgba(245,238,220,0.5); }
      `}</style>
    </>
  );
}

function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <div className="fixed top-0 right-0 left-0 h-[2px] z-[100] bg-obsidian/6">
      <motion.div
        className="h-full bg-gold"
        style={{ scaleX: progress, transformOrigin: 'right center' }}
        initial={false}
      />
    </div>
  );
}
