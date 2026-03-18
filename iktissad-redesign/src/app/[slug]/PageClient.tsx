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

export default function ArticlePageClient({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = useTranslation();
  const { slug } = use(params);
  const [copied, setCopied] = useState(false);
  const [readTime, setReadTime] = useState(0);

  const { data, error, isLoading } = useSWR<ApiResponse<Article>>(
    slug ? `/api/articles/${slug}` : null,
    swrFetcher
  );

  const article = data?.data;

  const { data: relatedData } = useSWR<ApiResponse<Article[]>>(
    article?.section
      ? `/api/articles?section=${article.section}&status=published&pageSize=5`
      : null,
    swrFetcher
  );
  const relatedArticles = (relatedData?.data ?? []).filter(a => a.id !== article?.id).slice(0, 4);

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

  const authorInitials = article.author?.name
    ? article.author.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
    : '';

  return (
    <>
      <ReadingProgressBar />
      <Header />

      <main className="bg-paper min-h-screen">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12">

          {/* ── Breadcrumb ── */}
          <div className="py-3 border-b border-sand/60">
            <nav className="flex items-center gap-1.5 text-[11px] font-[family-name:var(--font-display)] text-charcoal/40">
              <a href="/" className="hover:text-gold transition-colors flex items-center gap-1">
                الرئيسية
              </a>
              {article.section && (
                <>
                  <ChevronLeft size={9} />
                  <a href={`/sections/${article.section}`} className="hover:text-gold transition-colors">{article.section}</a>
                </>
              )}
              {article.sector && (
                <>
                  <ChevronLeft size={9} />
                  <span className="text-charcoal/25 truncate max-w-[220px]">{article.sector}</span>
                </>
              )}
            </nav>
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid lg:grid-cols-[1fr_300px] gap-10 pt-8 pb-20">

            {/* ── Main article column ── */}
            <motion.article
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Category pill */}
              <div className="mb-4">
                {article.sector && (
                  <a
                    href={`/sectors/${article.sector}`}
                    className="inline-block text-[11px] font-[family-name:var(--font-display)] font-bold text-gold border border-gold/40 rounded-full px-3.5 py-1 hover:bg-gold hover:text-obsidian transition-all"
                  >
                    {article.sector}
                  </a>
                )}
                {!article.sector && article.section && (
                  <a
                    href={`/sections/${article.section}`}
                    className="inline-block text-[11px] font-[family-name:var(--font-display)] font-bold text-gold border border-gold/40 rounded-full px-3.5 py-1 hover:bg-gold hover:text-obsidian transition-all"
                  >
                    {article.section}
                  </a>
                )}
              </div>

              {/* Title */}
              <h1
                className="font-[family-name:var(--font-display)] font-black text-obsidian mb-5 leading-snug"
                style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.3rem)', lineHeight: 1.3 }}
              >
                {article.title}
              </h1>

              {/* Share row */}
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-sand/60">
                <span className="text-[11px] font-[family-name:var(--font-display)] text-charcoal/35 flex items-center gap-1.5 ml-1">
                  مشاركة
                </span>
                <div className="flex items-center gap-2 flex-1">
                  {[
                    { p: 'facebook', icon: <Facebook size={12} />, bg: '#1877f2' },
                    { p: 'twitter', icon: <Twitter size={12} />, bg: '#0f1419' },
                    { p: 'linkedin', icon: <Linkedin size={12} />, bg: '#0a66c2' },
                  ].map(({ p, icon, bg }) => (
                    <button
                      key={p}
                      onClick={() => handleShare(p)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-80"
                      style={{ backgroundColor: bg }}
                    >
                      {icon}
                    </button>
                  ))}
                  <button
                    onClick={() => handleShare('copy')}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                      copied
                        ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
                        : 'border-sand text-charcoal/35 hover:border-obsidian/40 hover:text-obsidian'
                    }`}
                  >
                    {copied ? <Check size={12} /> : <Link2 size={12} />}
                  </button>
                </div>
                {readTime > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] font-[family-name:var(--font-display)] text-charcoal/35 mr-auto">
                    <BookOpen size={11} className="text-gold/60" />
                    {readTime} دقائق
                  </span>
                )}
              </div>

              {/* Featured image — full width */}
              {article.featuredImage && (
                <motion.figure
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="mb-6"
                >
                  <div className="overflow-hidden border border-sand/50">
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full object-cover"
                      style={{ maxHeight: '480px' }}
                    />
                  </div>
                </motion.figure>
              )}

              {/* Author block */}
              <div className="flex items-center gap-3 mb-8 pb-7 border-b border-sand/60">
                {/* Avatar circle */}
                <div className="w-10 h-10 rounded-full bg-obsidian flex items-center justify-center flex-shrink-0">
                  {authorInitials ? (
                    <span className="text-gold text-sm font-[family-name:var(--font-display)] font-bold">
                      {authorInitials}
                    </span>
                  ) : (
                    <User size={14} className="text-gold" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {article.author?.name && (
                    <p className="text-[13px] font-[family-name:var(--font-display)] font-bold text-obsidian leading-tight">
                      {article.author.name}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-0.5">
                    {publishedDate && (
                      <span className="flex items-center gap-1 text-[11px] font-[family-name:var(--font-display)] text-charcoal/40">
                        <Clock size={10} className="text-gold/60" />
                        {publishedDate}
                      </span>
                    )}
                    {article.views > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-[family-name:var(--font-display)] text-charcoal/40">
                        <Eye size={10} className="text-gold/60" />
                        {article.views.toLocaleString('ar-SA')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Excerpt */}
              {article.excerpt && (
                <p
                  className="font-[family-name:var(--font-display)] font-semibold text-navy/80 mb-8 leading-loose border-r-[3px] border-gold pr-4"
                  style={{ fontSize: '1.05rem', lineHeight: 1.95 }}
                >
                  {article.excerpt}
                </p>
              )}

              {/* Article body */}
              <div className="article-body-slug" dangerouslySetInnerHTML={{ __html: article.content ?? '' }} />

              {/* Tags */}
              {article.tags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-12 pt-8 border-t border-sand/60">
                  <span className="flex items-center gap-1.5 text-[9.5px] font-[family-name:var(--font-display)] font-black text-charcoal/30 uppercase tracking-widest ml-2">
                    <Tag size={10} /> الوسوم
                  </span>
                  {article.tags.map((tag) => (
                    <a
                      key={tag}
                      href={`/search?q=${encodeURIComponent(tag)}`}
                      className="px-3 py-1 text-[11px] font-[family-name:var(--font-display)] text-charcoal/50 border border-sand rounded-full hover:border-gold/50 hover:text-gold transition-all"
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              )}

              {/* Bottom share */}
              <div className="flex items-center gap-3 mt-8 pt-6 border-t border-sand/60">
                <span className="text-[11px] font-[family-name:var(--font-display)] text-charcoal/30">مشاركة المقال</span>
                <div className="flex items-center gap-2">
                  {[
                    { p: 'facebook', icon: <Facebook size={12} />, bg: '#1877f2' },
                    { p: 'twitter', icon: <Twitter size={12} />, bg: '#0f1419' },
                    { p: 'linkedin', icon: <Linkedin size={12} />, bg: '#0a66c2' },
                  ].map(({ p, icon, bg }) => (
                    <button
                      key={p}
                      onClick={() => handleShare(p)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: bg }}
                    >
                      {icon}
                    </button>
                  ))}
                  <button
                    onClick={() => handleShare('copy')}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                      copied ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-sand text-charcoal/35 hover:border-obsidian/40 hover:text-obsidian'
                    }`}
                  >
                    {copied ? <Check size={12} /> : <Link2 size={12} />}
                  </button>
                </div>
              </div>
            </motion.article>

            {/* ── Sidebar ── */}
            <motion.aside
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="sticky top-6 space-y-6">

                {/* Related articles */}
                {relatedArticles.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-[3px] h-5 bg-gold flex-shrink-0" />
                      <h3 className="text-[13px] font-[family-name:var(--font-display)] font-black text-obsidian tracking-wide">
                        قد يهمك أيضاً
                      </h3>
                    </div>
                    <div className="space-y-0 divide-y divide-sand/50 border border-sand/60">
                      {relatedArticles.map((related) => (
                        <a
                          key={related.id}
                          href={`/${related.id}`}
                          className="flex gap-3 p-3.5 hover:bg-cream/60 transition-colors group"
                        >
                          {related.featuredImage ? (
                            <div className="w-[68px] h-[54px] flex-shrink-0 overflow-hidden">
                              <img
                                src={related.featuredImage}
                                alt={related.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                          ) : (
                            <div className="w-[68px] h-[54px] flex-shrink-0 bg-obsidian/[0.04] flex items-center justify-center">
                              <BookOpen size={14} className="text-charcoal/20" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {related.sector && (
                              <span className="text-[9px] font-[family-name:var(--font-display)] font-black text-gold uppercase tracking-widest block mb-0.5">
                                {related.sector}
                              </span>
                            )}
                            <h4 className="text-[12px] font-[family-name:var(--font-display)] font-semibold text-obsidian/90 leading-snug line-clamp-3 group-hover:text-gold transition-colors">
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

                    {article.sector && (
                      <a
                        href={`/sectors/${article.sector}`}
                        className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 text-[11px] font-[family-name:var(--font-display)] font-bold text-charcoal/50 border border-sand/80 hover:border-gold hover:text-gold transition-all group rounded-sm"
                      >
                        المزيد من {article.sector}
                        <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
                      </a>
                    )}
                  </div>
                )}

                {/* Newsletter */}
                <div className="relative overflow-hidden bg-obsidian p-5">
                  <div
                    className="absolute inset-0 opacity-[0.05] pointer-events-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23DDA853' stroke-width='0.5'%3E%3Cpath d='M40 0L55 25L80 40L55 55L40 80L25 55L0 40L25 25Z'/%3E%3Ccircle cx='40' cy='40' r='12'/%3E%3C/g%3E%3C/svg%3E")` }}
                  />
                  <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
                  <div className="relative">
                    <p className="text-[9px] font-[family-name:var(--font-display)] font-black text-gold uppercase tracking-[0.22em] mb-2">
                      النشرة الإخبارية
                    </p>
                    <p className="text-[12px] font-[family-name:var(--font-display)] text-paper/50 mb-4 leading-relaxed">
                      أحدث التحليلات الاقتصادية مباشرة إلى بريدك
                    </p>
                    <input
                      type="email"
                      placeholder="بريدك الإلكتروني"
                      dir="ltr"
                      className="w-full bg-white/[0.06] border border-white/10 text-paper placeholder:text-paper/20 px-3 py-2 text-[12px] font-[family-name:var(--font-display)] mb-2.5 focus:outline-none focus:border-gold/40 transition-colors"
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
        .article-body-slug {
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: 1.05rem;
          line-height: 2.05;
          color: #1E4A60;
        }
        .article-body-slug > p:first-of-type::first-letter {
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
        .article-body-slug p { margin-bottom: 1.6rem; }
        .article-body-slug h2 {
          font-family: var(--font-display), system-ui, sans-serif;
          font-size: 1.45rem;
          font-weight: 900;
          color: #0C1E2A;
          margin-top: 3rem;
          margin-bottom: 1.1rem;
          line-height: 1.38;
        }
        .article-body-slug h3 {
          font-family: var(--font-display), system-ui, sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #183B4E;
          margin-top: 2.25rem;
          margin-bottom: 0.875rem;
        }
        .article-body-slug blockquote {
          border-right: 3px solid #DDA853;
          border-top: 1px solid rgba(221,168,83,0.15);
          border-bottom: 1px solid rgba(221,168,83,0.15);
          padding: 1.25rem 1.4rem;
          margin: 2.25rem 0;
          background: rgba(221,168,83,0.03);
        }
        .article-body-slug blockquote p {
          font-size: 1.05rem;
          font-weight: 600;
          color: #183B4E;
          margin-bottom: 0;
          font-family: var(--font-display), system-ui, sans-serif;
          line-height: 1.85;
          font-style: italic;
        }
        .article-body-slug ul, .article-body-slug ol { padding-right: 1.5rem; margin-bottom: 1.5rem; }
        .article-body-slug li { margin-bottom: 0.55rem; line-height: 1.9; }
        .article-body-slug ul li::marker { color: #DDA853; }
        .article-body-slug a { color: #C49240; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: rgba(196,146,64,0.3); }
        .article-body-slug a:hover { color: #DDA853; }
        .article-body-slug strong { font-weight: 700; color: #0C1E2A; }
        .article-body-slug em { color: #275A73; }
        .article-body-slug img { max-width: 100%; height: auto; margin: 2rem 0; border: 1px solid #E8E0D0; display: block; }
        .article-body-slug figure { margin: 2rem 0; }
        .article-body-slug figcaption { font-size: 0.78rem; color: #548490; font-family: var(--font-display), system-ui, sans-serif; margin-top: 0.5rem; text-align: center; }
        .article-body-slug table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.9rem; }
        .article-body-slug th { background: #183B4E; color: #F5EEDC; padding: 0.65rem 1rem; font-family: var(--font-display), system-ui, sans-serif; font-weight: 700; text-align: right; }
        .article-body-slug td { padding: 0.6rem 1rem; border-bottom: 1px solid #E8E0D0; color: #2A5A6E; }
        .article-body-slug tr:nth-child(even) td { background: rgba(245,238,220,0.5); }
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
    <div className="fixed top-0 right-0 left-0 h-[2px] z-[100] bg-obsidian/5">
      <motion.div className="h-full bg-gold" style={{ scaleX: progress, transformOrigin: 'right center' }} initial={false} />
    </div>
  );
}
