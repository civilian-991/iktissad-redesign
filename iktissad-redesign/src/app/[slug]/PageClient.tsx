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
  ChevronLeft,
  Tag,
  User,
  BookOpen,
  Check,
  ArrowLeft,
  Loader2,
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
        <main className="min-h-screen bg-obsidian flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="text-gold animate-spin" size={32} />
            <span className="text-paper/40 text-sm font-[family-name:var(--font-display)] tracking-widest uppercase">
              جاري التحميل
            </span>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !article) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-obsidian flex flex-col items-center justify-center gap-5">
          <div className="w-8 h-px bg-gold/60" />
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-black text-paper">
            المقال غير موجود
          </h1>
          <a href="/" className="text-xs text-gold hover:text-gold-bright transition-colors font-[family-name:var(--font-display)] tracking-widest uppercase">
            العودة إلى الرئيسية
          </a>
        </main>
        <Footer />
      </>
    );
  }

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <>
      <ReadingProgressBar />
      <Header />

      <main>

        {/* ══════════════════════════════════════════════════════
            DARK HERO — Contained editorial header with image
            ══════════════════════════════════════════════════════ */}
        <div className="bg-[#0C1E2A]">
        <div className="max-w-[1160px] mx-auto">
        <section className="relative min-h-[58vh] bg-[#0C1E2A] overflow-hidden flex flex-col justify-end">

          {/* Background image */}
          {article.featuredImage && (
            <div
              className="absolute inset-0 bg-center bg-cover scale-105"
              style={{
                backgroundImage: `url(${article.featuredImage})`,
                filter: 'saturate(0.7)',
              }}
            />
          )}

          {/* Layered overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C1E2A] via-[#0C1E2A]/75 to-[#0C1E2A]/30" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0C1E2A]/40" />

          {/* Arabesque texture on fallback */}
          {!article.featuredImage && (
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23DDA853' stroke-width='0.4' opacity='1'%3E%3Cpath d='M60 0L80 40L120 60L80 80L60 120L40 80L0 60L40 40Z'/%3E%3Ccircle cx='60' cy='60' r='20'/%3E%3Ccircle cx='60' cy='60' r='35'/%3E%3Cpath d='M60 25L60 95M25 60L95 60'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          )}

          {/* Top accent line */}
          <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          {/* Hero content */}
          <div className="relative px-6 sm:px-10 lg:px-14 pt-16 pb-16">

            {/* Breadcrumb */}
            <motion.nav
              className="flex items-center gap-1.5 mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              <a href="/" className="text-paper/35 hover:text-gold text-xs font-[family-name:var(--font-display)] transition-colors">
                {t('components.breadcrumb.home')}
              </a>
              {article.section && (
                <>
                  <ChevronLeft size={9} className="text-paper/20" />
                  <a
                    href={`/sections/${article.section}`}
                    className="text-paper/35 hover:text-gold text-xs font-[family-name:var(--font-display)] transition-colors"
                  >
                    {article.section}
                  </a>
                </>
              )}
              {article.sector && (
                <>
                  <ChevronLeft size={9} className="text-paper/20" />
                  <span className="text-paper/25 text-xs font-[family-name:var(--font-display)] truncate max-w-[200px]">
                    {article.sector}
                  </span>
                </>
              )}
            </motion.nav>

            {/* Sector + Section badges */}
            <motion.div
              className="flex items-center gap-3 mb-7"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              {article.sector && (
                <span className="bg-gold text-obsidian text-[11px] font-[family-name:var(--font-display)] font-black px-3.5 py-1.5 tracking-wider">
                  {article.sector}
                </span>
              )}
              {article.section && (
                <span className="border border-paper/15 text-paper/45 text-[11px] font-[family-name:var(--font-display)] px-3.5 py-1.5">
                  {article.section}
                </span>
              )}
            </motion.div>

            {/* Title */}
            <motion.h1
              className="font-[family-name:var(--font-display)] font-black text-paper mb-9"
              style={{
                fontSize: 'clamp(1.8rem, 4.5vw, 3.5rem)',
                lineHeight: 1.22,
                maxWidth: '860px',
                textShadow: '0 4px 32px rgba(0,0,0,0.5)',
              }}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {article.title}
            </motion.h1>

            {/* Gold rule */}
            <motion.div
              style={{
                height: '1px',
                maxWidth: '560px',
                background: 'linear-gradient(to left, #DDA853 0%, rgba(221,168,83,0.25) 60%, transparent 100%)',
                marginBottom: '1.75rem',
              }}
              initial={{ scaleX: 0, transformOrigin: 'right' }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.42, duration: 0.75 }}
            />

            {/* Meta strip */}
            <motion.div
              className="flex flex-wrap items-center gap-x-8 gap-y-2.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {article.author?.name && (
                <span className="flex items-center gap-2.5 font-[family-name:var(--font-display)]">
                  <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0">
                    <User size={11} className="text-gold" />
                  </div>
                  <span className="text-paper/90 text-sm font-semibold">{article.author.name}</span>
                </span>
              )}
              {publishedDate && (
                <span className="flex items-center gap-1.5 text-sm font-[family-name:var(--font-display)] text-paper/40">
                  <Clock size={11} className="text-gold/50" />
                  {publishedDate}
                </span>
              )}
              {article.views > 0 && (
                <span className="flex items-center gap-1.5 text-sm font-[family-name:var(--font-display)] text-paper/40">
                  <Eye size={11} className="text-gold/50" />
                  {article.views.toLocaleString('ar-SA')} مشاهدة
                </span>
              )}
              {readTime > 0 && (
                <span className="flex items-center gap-1.5 text-sm font-[family-name:var(--font-display)] text-paper/40">
                  <BookOpen size={11} className="text-gold/50" />
                  {readTime} دقائق للقراءة
                </span>
              )}
            </motion.div>

          </div>

          {/* Bottom fade to paper */}
          <div className="absolute bottom-0 right-0 left-0 h-8 bg-gradient-to-b from-transparent to-paper" />
        </section>
        </div>
        </div>


        {/* ══════════════════════════════════════════════════════
            ARTICLE BODY — Light reading zone
            ══════════════════════════════════════════════════════ */}
        <section className="bg-paper pb-20 pt-2">
          <div className="max-w-[1160px] mx-auto px-6 sm:px-10 lg:px-14">
            <div className="grid lg:grid-cols-[1fr_308px] gap-14 items-start">

              {/* ─── Main Article ─── */}
              <article>

                {/* Lead / Excerpt */}
                {article.excerpt && (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08, duration: 0.55 }}
                    className="my-10"
                  >
                    <div className="relative border-r-4 border-gold pr-6 py-1">
                      <p
                        className="font-[family-name:var(--font-display)] font-semibold text-obsidian/75 leading-loose"
                        style={{ fontSize: '1.15rem', lineHeight: 1.95 }}
                      >
                        {article.excerpt}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Separator ornament */}
                <div className="flex items-center gap-4 mb-10 mt-2">
                  <div className="flex-1 h-px bg-sand" />
                  <div className="w-1.5 h-1.5 bg-gold rotate-45 flex-shrink-0" />
                  <div className="w-1.5 h-1.5 border border-gold rotate-45 flex-shrink-0" />
                  <div className="w-1.5 h-1.5 bg-gold rotate-45 flex-shrink-0" />
                  <div className="flex-1 h-px bg-sand" />
                </div>

                {/* Article body */}
                {article.content && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="article-body-redesign"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                  />
                )}

                {/* Tags */}
                {article.tags?.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-14 pt-10 border-t border-sand"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-display)] font-black text-gold uppercase tracking-widest ml-2">
                        <Tag size={11} />
                        الوسوم
                      </span>
                      {article.tags.map((tag) => (
                        <a
                          key={tag}
                          href={`/search?q=${encodeURIComponent(tag)}`}
                          className="px-3.5 py-1.5 text-[11px] font-[family-name:var(--font-display)] text-charcoal/55 border border-sand hover:border-obsidian hover:text-obsidian hover:bg-obsidian/[0.03] transition-all duration-200"
                        >
                          {tag}
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Share row */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-10 pt-8 border-t border-sand flex items-center justify-between flex-wrap gap-4"
                >
                  <span className="text-[10px] font-[family-name:var(--font-display)] font-black text-obsidian/30 uppercase tracking-[0.2em]">
                    مشاركة المقال
                  </span>
                  <div className="flex items-center gap-2">
                    {[
                      { platform: 'facebook', icon: <Facebook size={12} />, label: 'Facebook', bg: '#1877f2' },
                      { platform: 'twitter', icon: <Twitter size={12} />, label: 'X / Twitter', bg: '#0f1419' },
                      { platform: 'linkedin', icon: <Linkedin size={12} />, label: 'LinkedIn', bg: '#0a66c2' },
                    ].map(({ platform, icon, label, bg }) => (
                      <button
                        key={platform}
                        onClick={() => handleShare(platform)}
                        title={label}
                        className="w-9 h-9 flex items-center justify-center text-white transition-all duration-200 hover:opacity-85 hover:-translate-y-0.5"
                        style={{ backgroundColor: bg }}
                      >
                        {icon}
                      </button>
                    ))}
                    <button
                      onClick={() => handleShare('copy')}
                      title={copied ? 'تم النسخ' : 'نسخ الرابط'}
                      className={`w-9 h-9 border flex items-center justify-center transition-all duration-200 ${
                        copied
                          ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
                          : 'border-sand text-charcoal/40 hover:border-obsidian hover:text-obsidian'
                      }`}
                    >
                      {copied ? <Check size={12} /> : <Link2 size={12} />}
                    </button>
                  </div>
                </motion.div>

              </article>


              {/* ─── Sidebar ─── */}
              <aside>
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="sticky top-24 space-y-5"
                >

                  {/* Related articles panel */}
                  <div className="border border-sand overflow-hidden">
                    <div className="bg-obsidian px-5 py-3.5 flex items-center gap-2.5">
                      <div className="w-px h-4 bg-gold flex-shrink-0" />
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-[13px] text-paper tracking-wide">
                        {t('pages.news.relatedArticles')}
                      </h3>
                    </div>

                    {relatedArticles.length === 0 ? (
                      <p className="text-charcoal/35 text-xs font-[family-name:var(--font-display)] py-8 text-center">
                        لا توجد مقالات ذات صلة
                      </p>
                    ) : (
                      <div className="divide-y divide-sand/50">
                        {relatedArticles.map((related, index) => (
                          <motion.a
                            key={related.id}
                            href={`/${related.slug}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.38 + index * 0.07 }}
                            className="flex gap-3 p-4 hover:bg-cream/50 transition-colors group"
                          >
                            {related.featuredImage ? (
                              <div className="w-[66px] h-[52px] flex-shrink-0 overflow-hidden border border-sand/60">
                                <img
                                  src={related.featuredImage}
                                  alt={related.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              </div>
                            ) : (
                              <div className="w-[66px] h-[52px] flex-shrink-0 bg-obsidian/[0.04] border border-sand/60 flex items-center justify-center">
                                <BookOpen size={13} className="text-charcoal/20" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              {related.sector && (
                                <span className="text-[9px] font-[family-name:var(--font-display)] font-black text-gold uppercase tracking-widest block mb-0.5">
                                  {related.sector}
                                </span>
                              )}
                              <h4 className="font-[family-name:var(--font-display)] font-semibold text-[11.5px] text-obsidian leading-snug line-clamp-3 group-hover:text-gold transition-colors duration-200">
                                {related.title}
                              </h4>
                              {related.publishedAt && (
                                <span className="flex items-center gap-1 text-[9px] text-charcoal/30 mt-1.5">
                                  <Clock size={8} />
                                  {new Date(related.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </motion.a>
                        ))}
                      </div>
                    )}

                    {article.sector && (
                      <div className="border-t border-sand/60 p-3.5">
                        <a
                          href={`/sectors/${article.sector}`}
                          className="flex items-center justify-center gap-2 w-full py-2.5 text-[11px] font-[family-name:var(--font-display)] font-bold text-obsidian/60 border border-obsidian/12 hover:bg-obsidian hover:text-gold hover:border-obsidian transition-all duration-250 group"
                        >
                          المزيد من {article.sector}
                          <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Newsletter widget */}
                  <div className="relative overflow-hidden bg-obsidian p-6">
                    {/* Arabesque background */}
                    <div
                      className="absolute inset-0 opacity-[0.06] pointer-events-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23DDA853' stroke-width='0.5'%3E%3Cpath d='M40 0L55 25L80 40L55 55L40 80L25 55L0 40L25 25Z'/%3E%3Ccircle cx='40' cy='40' r='12'/%3E%3C/g%3E%3C/svg%3E")`,
                      }}
                    />
                    <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
                    <div className="relative">
                      <p className="text-[9px] font-[family-name:var(--font-display)] font-black text-gold uppercase tracking-[0.25em] mb-2.5">
                        النشرة الإخبارية
                      </p>
                      <p className="text-[12.5px] font-[family-name:var(--font-display)] text-paper/60 mb-5 leading-relaxed">
                        أحدث التحليلات الاقتصادية مباشرة إلى بريدك الإلكتروني
                      </p>
                      <input
                        type="email"
                        placeholder="بريدك الإلكتروني"
                        className="w-full bg-white/[0.06] border border-white/10 text-paper placeholder:text-paper/25 px-3 py-2.5 text-[12.5px] font-[family-name:var(--font-display)] mb-3 focus:outline-none focus:border-gold/40 transition-colors"
                        dir="ltr"
                      />
                      <button className="w-full bg-gold text-obsidian py-2.5 text-[12px] font-[family-name:var(--font-display)] font-black tracking-wide hover:bg-gold-bright transition-colors">
                        اشتراك
                      </button>
                    </div>
                  </div>

                </motion.div>
              </aside>

            </div>
          </div>
        </section>

      </main>

      <Footer />

      <style>{`
        /* ── Article Typography ── */
        .article-body-redesign {
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: 1.065rem;
          line-height: 2.05;
          color: #1E4A60;
        }

        /* Drop cap — first letter of first paragraph */
        .article-body-redesign > p:first-of-type::first-letter {
          font-family: var(--font-display), system-ui, sans-serif;
          font-size: 3.75rem;
          font-weight: 900;
          color: #DDA853;
          float: right;
          line-height: 0.82;
          margin-left: 0.12em;
          margin-bottom: -0.08em;
          margin-top: 0.08em;
        }

        .article-body-redesign p {
          margin-bottom: 1.65rem;
        }

        .article-body-redesign h2 {
          font-family: var(--font-display), system-ui, sans-serif;
          font-size: 1.35rem;
          font-weight: 800;
          color: #0C1E2A;
          margin-top: 3rem;
          margin-bottom: 1.25rem;
          padding-right: 1rem;
          border-right: 3px solid #DDA853;
          line-height: 1.42;
        }

        .article-body-redesign h3 {
          font-family: var(--font-display), system-ui, sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #183B4E;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .article-body-redesign blockquote {
          position: relative;
          border-right: 3px solid #DDA853;
          border-left: none;
          border-top: 1px solid rgba(221, 168, 83, 0.18);
          border-bottom: 1px solid rgba(221, 168, 83, 0.18);
          padding: 1.4rem 1.5rem;
          margin: 2.5rem 0;
          background: rgba(221, 168, 83, 0.035);
        }

        .article-body-redesign blockquote p {
          font-size: 1.075rem;
          font-weight: 600;
          color: #183B4E;
          margin-bottom: 0;
          font-family: var(--font-display), system-ui, sans-serif;
          line-height: 1.9;
          font-style: italic;
        }

        .article-body-redesign ul,
        .article-body-redesign ol {
          padding-right: 1.5rem;
          margin-bottom: 1.6rem;
        }

        .article-body-redesign li {
          margin-bottom: 0.6rem;
          line-height: 1.9;
        }

        .article-body-redesign ul li::marker {
          color: #DDA853;
        }

        .article-body-redesign a {
          color: #C49240;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: rgba(196, 146, 64, 0.3);
          transition: color 0.2s, text-decoration-color 0.2s;
        }

        .article-body-redesign a:hover {
          color: #DDA853;
          text-decoration-color: #DDA853;
        }

        .article-body-redesign strong {
          font-weight: 700;
          color: #0C1E2A;
        }

        .article-body-redesign em {
          color: #275A73;
        }

        .article-body-redesign img {
          max-width: 100%;
          height: auto;
          margin: 2rem 0;
          border: 1px solid #E8E0D0;
          display: block;
        }

        .article-body-redesign hr {
          border: none;
          height: 1px;
          background: linear-gradient(to right, transparent, #D8CDB8 30%, #D8CDB8 70%, transparent);
          margin: 2.75rem 0;
          position: relative;
        }

        .article-body-redesign table {
          width: 100%;
          border-collapse: collapse;
          margin: 2rem 0;
          font-size: 0.9rem;
        }

        .article-body-redesign th {
          background: #183B4E;
          color: #F5EEDC;
          padding: 0.75rem 1rem;
          font-family: var(--font-display), system-ui, sans-serif;
          font-weight: 700;
          text-align: right;
        }

        .article-body-redesign td {
          padding: 0.65rem 1rem;
          border-bottom: 1px solid #E8E0D0;
          color: #2A5A6E;
        }

        .article-body-redesign tr:nth-child(even) td {
          background: rgba(245, 238, 220, 0.5);
        }
      `}</style>
    </>
  );
}


/* ══════════════════════════════════════════════════════
   Reading Progress Bar
   ══════════════════════════════════════════════════════ */
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
    <div className="fixed top-0 right-0 left-0 h-[3px] z-[100] bg-obsidian/8">
      <motion.div
        className="h-full"
        style={{
          scaleX: progress,
          transformOrigin: 'right center',
          background: 'linear-gradient(to left, #DDA853 0%, #E5BA6F 50%, #DDA853 100%)',
        }}
        initial={false}
      />
    </div>
  );
}
