'use client';

import React, { use, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import NextImage from 'next/image';
import {
  Clock,
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
  Printer,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';
import BookmarkButton from '@/components/BookmarkButton';
import { trackShareEvent } from '@/lib/api-client';
import PaywallModal from '@/components/magazine/PaywallModal';
import TipTapRenderer from '@/components/admin/TipTapRenderer';
import ArticleComments from '@/components/ArticleComments';
import GiftArticleButton from '@/components/GiftArticleButton';
import ArticleTldr from '@/components/ArticleTldr';
import RelatedArticles from '@/components/RelatedArticles';
import ListenButton from '@/components/ListenButton';
import Poll from '@/components/Poll';
import LiveBlog from '@/components/LiveBlog';
import type { JSONContent } from '@tiptap/core';
import { addBidiIsolation } from '@/lib/i18n/format';
import { sanitizeArticleHtml } from '@/lib/sanitize';

// ── Paywall constants ──────────────────────────────────────────────────────────
const FREE_ARTICLE_LIMIT_DEFAULT = 5;

// ── Anonymous session helpers ─────────────────────────────────────────────────
const SESSION_COOKIE = 'ikt_sid';
const ANON_METER_KEY = 'ikt_reads';

function getOrCreateSessionId(): string {
  if (typeof document === 'undefined') return '';
  const existing = document.cookie
    .split('; ')
    .find(r => r.startsWith(`${SESSION_COOKIE}=`))
    ?.split('=')[1];
  if (existing) return existing;
  const id = crypto.randomUUID();
  // 30-day session cookie
  document.cookie = `${SESSION_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  return id;
}

/** Returns count of unique articles read this calendar month by anonymous user. */
function getAnonReadCount(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(ANON_METER_KEY);
    if (!raw) return 0;
    const { month, slugs }: { month: string; slugs: string[] } = JSON.parse(raw);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    if (month !== currentMonth) return 0;
    return Array.isArray(slugs) ? slugs.length : 0;
  } catch {
    return 0;
  }
}

/** Adds a slug to the anonymous meter. Returns new count. */
function recordAnonRead(slug: string): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    const raw = localStorage.getItem(ANON_METER_KEY);
    let slugs: string[] = [];
    if (raw) {
      const parsed: { month: string; slugs: string[] } = JSON.parse(raw);
      if (parsed.month === currentMonth) slugs = parsed.slugs ?? [];
    }
    if (!slugs.includes(slug)) slugs.push(slug);
    localStorage.setItem(ANON_METER_KEY, JSON.stringify({ month: currentMonth, slugs }));
    return slugs.length;
  } catch {
    return 0;
  }
}

// ── Video helpers ─────────────────────────────────────────────────────────────
function toEmbedUrl(src: string): string {
  const s = src.trim();
  if (s.includes('youtube') || s.includes('youtu.be')) {
    if (s.includes('/embed/')) return s;
    const short = s.match(/youtu\.be\/([^?&]+)/);
    if (short) return `https://www.youtube.com/embed/${short[1]}`;
    const watch = s.match(/[?&]v=([^&]+)/);
    if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  }
  if (s.includes('vimeo')) {
    const m = s.match(/vimeo\.com\/(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;
  }
  return s;
}

/** Extract first [Video: URL] or <iframe src="..."> from HTML. Returns embed URL or null. */
function extractHeroVideo(html: string): string | null {
  // [Video: URL] placeholder (from migration)
  const placeholder = html.match(/\[Video:\s*(https?:\/\/[^\]]+)\]/);
  if (placeholder) return toEmbedUrl(placeholder[1]);
  // Raw iframe (if migration ran without cleanHtml)
  const iframe = html.match(/<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (iframe) return toEmbedUrl(iframe[1]);
  return null;
}

/** Remove the first video placeholder/iframe from HTML (it's shown in the hero instead). */
function stripFirstVideo(html: string): string {
  // Remove [Video: URL] placeholder paragraph
  let result = html.replace(/<p>\s*\[Video:\s*https?:\/\/[^\]]+\]\s*<\/p>/i, '');
  if (result !== html) return result;
  // Fallback: strip bare placeholder without <p>
  result = html.replace(/\[Video:\s*https?:\/\/[^\]]+\]/i, '');
  if (result !== html) return result;
  // Strip raw iframe
  result = html.replace(/<iframe[^>]+>[\s\S]*?<\/iframe>/i, '');
  return result;
}

/** Restore remaining [Video: URL] placeholders in body as inline embeds. */
function restoreVideoEmbeds(html: string): string {
  return html.replace(/\[Video:\s*(https?:\/\/[^\]]+)\]/g, (_, src) => {
    const embedSrc = toEmbedUrl(src);
    return `<div class="video-embed-wrapper"><iframe src="${embedSrc}" allowfullscreen loading="lazy" title="فيديو"></iframe></div>`;
  });
}

// ── Helper: truncate HTML string to first N closing </p> tags ─────────────────
function truncateHtmlToParagraphs(html: string, maxParagraphs = 3): string {
  let count = 0;
  let idx = 0;
  while (count < maxParagraphs) {
    const next = html.indexOf('</p>', idx);
    if (next === -1) break;
    idx = next + 4;
    count++;
  }
  return count > 0 ? html.slice(0, idx) : html.slice(0, 500);
}

interface PaywallSettings {
  freeArticleLimit: number;
  giftLinksPerMonth: number;
  singleArticleDefaultPrice: number;
  dynamicPaywall: boolean;
  socialBonusArticle: boolean;
  highEngagementBonus: number;
  highEngagementThreshold: number;
}

interface ArticlePageClientProps {
  params: Promise<{ slug: string }>;
  subscriptionTier?: 'free' | 'premium' | 'digital';
  freeArticlesReadThisMonth?: number;
  freeArticleLimit?: number;
  hasPurchasedArticle?: boolean;
  giftValid?: boolean;
  giftToken?: string;
  paywallSettings?: PaywallSettings;
  dbUserId?: string | null;
}

export default function ArticlePageClient({
  params,
  subscriptionTier = 'free',
  freeArticlesReadThisMonth = 0,
  freeArticleLimit = FREE_ARTICLE_LIMIT_DEFAULT,
  hasPurchasedArticle = false,
  giftValid = false,
  giftToken,
  paywallSettings,
  dbUserId,
}: ArticlePageClientProps) {
  const { t } = useTranslation();
  const { slug } = use(params);
  const [copied, setCopied] = useState(false);
  const [readTime, setReadTime] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  // 0 = small, 1 = medium (default), 2 = large
  const [fontSizeIdx, setFontSizeIdx] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const saved = localStorage.getItem('article-font-size');
    return saved !== null ? parseInt(saved, 10) : 1;
  });
  const FONT_SIZES = ['0.92rem', '1.05rem', '1.22rem'];
  const articleFontSize = FONT_SIZES[fontSizeIdx];

  const changeFontSize = (delta: number) => {
    setFontSizeIdx((prev) => {
      const next = Math.max(0, Math.min(2, prev + delta));
      localStorage.setItem('article-font-size', String(next));
      return next;
    });
  };

  const { data, error, isLoading } = useSWR<ApiResponse<Article>>(
    slug ? `/api/articles/${slug}` : null,
    swrFetcher
  );

  const article = data?.data;

  // F2.5 — Semantic "More Like This": try pgvector similar endpoint first,
  // fall back to same-section articles if the semantic result is empty/errors.
  const { data: similarData, error: similarError } = useSWR<ApiResponse<Article[]>>(
    article?.id ? `/api/search/similar?articleId=${article.id}&limit=4` : null,
    swrFetcher
  );
  const hasSimilar = !similarError && (similarData?.data?.length ?? 0) > 0;

  const { data: sectionData } = useSWR<ApiResponse<Article[]>>(
    !hasSimilar && article?.section
      ? `/api/articles?section=${article.section}&status=published&pageSize=5`
      : null,
    swrFetcher
  );

  const relatedArticles: Article[] = hasSimilar
    ? (similarData!.data as unknown as Article[]).filter((a) => a.id !== article?.id).slice(0, 4)
    : (sectionData?.data ?? []).filter((a) => a.id !== article?.id).slice(0, 4);

  const relatedIsAi = hasSimilar;

  // ── Anonymous meter: count from localStorage for non-authenticated users ─────
  const [anonReadCount, setAnonReadCount] = useState(0);
  useEffect(() => {
    if (subscriptionTier === 'free' && !dbUserId) {
      setAnonReadCount(getAnonReadCount());
    }
  }, [subscriptionTier, dbUserId]);

  // ── Track article read (fire-and-forget after article loads) ─────────────
  useEffect(() => {
    if (!article?.id) return;
    const sessionId = getOrCreateSessionId();

    // Bump anonymous meter
    if (!dbUserId) {
      const newCount = recordAnonRead(slug);
      setAnonReadCount(newCount);
    }

    // Post reading session (best-effort, non-blocking)
    fetch('/api/track/article-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: article.id,
        sessionId,
        referrer: document.referrer || undefined,
      }),
    }).catch(() => { /* ignore */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id]);

  // ── Paywall gate logic ─────────────────────────────────────────────────────
  // Bypass conditions: paid subscriber, purchased article, or valid gift link
  const effectiveReadCount = dbUserId ? freeArticlesReadThisMonth : anonReadCount;
  const isPaywalled =
    article?.paywalled === true &&
    !hasPurchasedArticle &&
    !giftValid &&
    subscriptionTier === 'free' &&
    effectiveReadCount >= freeArticleLimit;

  // Determine content format: TipTap JSON or legacy HTML string
  const _baseContent = article?.content ?? '';
  const isJsonContent =
    typeof _baseContent === 'object' ||
    (typeof _baseContent === 'string' && _baseContent.trim().startsWith('{'));
  // Hero video: prefer explicit video_url field, fall back to scanning legacy HTML content
  const heroVideoUrl: string | null =
    article?.videoUrl
      ? toEmbedUrl(article.videoUrl)
      : isJsonContent ? null : extractHeroVideo(_baseContent);
  const rawContent = isJsonContent
    ? _baseContent
    : restoreVideoEmbeds(heroVideoUrl ? stripFirstVideo(_baseContent) : _baseContent);

  // For paywall: parse/truncate to ~3 paragraphs
  const truncatedHtml = isPaywalled && !isJsonContent
    ? truncateHtmlToParagraphs(rawContent as string, 3)
    : null;

  // For paywall + JSON content: truncate to first 3 paragraph nodes
  const truncatedJson: JSONContent | null = (() => {
    if (!isPaywalled || !isJsonContent) return null;
    try {
      const parsed: JSONContent =
        typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent as JSONContent;
      const paragraphs = (parsed.content ?? [])
        .filter((n: JSONContent) => n.type === 'paragraph')
        .slice(0, 3);
      return { type: 'doc', content: paragraphs };
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (article?.content) {
      const words = (typeof article.content === 'string' ? article.content : JSON.stringify(article.content))
        .replace(/<[^>]*>/g, '').split(/\s+/).length;
      setReadTime(Math.ceil(words / 200));
    }
  }, [article?.content]);

  const handleShare = (platform: string) => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const text = article?.title ?? '';

    // Track share event (fire-and-forget)
    if (article?.id) {
      const trackPlatform = platform === 'copy' ? 'copy_link' : platform;
      void trackShareEvent({ articleId: article.id, platform: trackPlatform }).catch(() => {});
    }

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
          <Link href="/" className="text-sm text-gold hover:underline font-[family-name:var(--font-display)]">العودة إلى الرئيسية</Link>
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
            <nav className="flex items-center gap-1.5 text-[13px] font-[family-name:var(--font-display)] text-charcoal/40">
              <Link href="/" className="hover:text-gold transition-colors flex items-center gap-1">
                الرئيسية
              </Link>
              {article.section && (
                <>
                  <ChevronLeft size={9} />
                  <a href={`/topics/${article.section}`} className="hover:text-gold transition-colors">{article.section}</a>
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
              {/* Print-only header (hidden on screen) */}
              <div className="print-header">
                <div style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>
                  <strong>الإقتصاد والأعمال</strong> — iktissad.com
                </div>
                <div style={{ fontSize: '10pt', color: '#666', marginBottom: '8px' }}>
                  {article.publishedAt && new Date(article.publishedAt).toLocaleDateString('ar-SA')} · URL: {typeof window !== 'undefined' ? window.location.href : ''}
                </div>
              </div>

              {/* Category pill */}
              <div className="mb-4">
                {article.sector && (
                  <a
                    href={`/industries/${article.sector}`}
                    className="inline-block text-[13px] font-[family-name:var(--font-display)] font-bold text-gold border border-gold/40 rounded-full px-3.5 py-1 hover:bg-gold hover:text-obsidian transition-all"
                  >
                    {article.sector}
                  </a>
                )}
                {!article.sector && article.section && (
                  <a
                    href={`/topics/${article.section}`}
                    className="inline-block text-[13px] font-[family-name:var(--font-display)] font-bold text-gold border border-gold/40 rounded-full px-3.5 py-1 hover:bg-gold hover:text-obsidian transition-all"
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
                <span className="text-[13px] font-[family-name:var(--font-display)] text-charcoal/35 flex items-center gap-1.5 ml-1">
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
                  <button
                    onClick={() => window.print()}
                    className="no-print w-8 h-8 rounded-full border border-sand text-charcoal/35 hover:border-obsidian/40 hover:text-obsidian flex items-center justify-center transition-all"
                    title={t('article.print')}
                    aria-label={t('article.print')}
                  >
                    <Printer size={12} />
                  </button>

                  {/* Font size controls */}
                  <div className="no-print flex items-center border border-sand rounded-full overflow-hidden mr-1">
                    <button
                      onClick={() => changeFontSize(-1)}
                      disabled={fontSizeIdx === 0}
                      className="px-2.5 h-8 text-[13px] font-[family-name:var(--font-display)] font-bold text-charcoal/40 hover:text-obsidian hover:bg-sand/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all border-l border-sand"
                      aria-label="تصغير الخط"
                    >
                      أ-
                    </button>
                    <button
                      onClick={() => changeFontSize(1)}
                      disabled={fontSizeIdx === 2}
                      className="px-2.5 h-8 text-[13px] font-[family-name:var(--font-display)] font-bold text-charcoal/40 hover:text-obsidian hover:bg-sand/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all border-l border-sand"
                      aria-label="تكبير الخط"
                    >
                      أ+
                    </button>
                  </div>
                </div>
                {/* Bookmark button */}
                <BookmarkButton articleId={article.id} />
                {/* Phase 6.5 — Text-to-Speech */}
                <ListenButton
                  text={typeof rawContent === 'string' ? rawContent.replace(/<[^>]+>/g, '') : article.excerpt || article.title}
                  lang="ar"
                  articleId={article.id}
                />
                {readTime > 0 && (
                  <span className="flex items-center gap-1.5 text-[13px] font-[family-name:var(--font-display)] text-charcoal/35 mr-auto">
                    <BookOpen size={11} className="text-gold/60" />
                    {readTime} دقائق
                  </span>
                )}
              </div>

              {/* Featured media — video embed or image */}
              {(heroVideoUrl || article.featuredImage) && (
                <motion.figure
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="mb-6"
                >
                  {heroVideoUrl ? (
                    <div className="relative overflow-hidden border border-sand/50 aspect-video">
                      <iframe
                        src={heroVideoUrl}
                        title={article.title}
                        allowFullScreen
                        loading="eager"
                        className="absolute inset-0 w-full h-full border-0"
                      />
                    </div>
                  ) : (
                    <div className="relative overflow-hidden border border-sand/50 aspect-[1200/630]">
                      <NextImage
                        src={article.featuredImage}
                        alt={article.title}
                        fill
                        className="object-cover"
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 900px"
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjYzMCI+PHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNjMwIiBmaWxsPSIjRThENUI3Ii8+PC9zdmc+"
                      />
                    </div>
                  )}
                </motion.figure>
              )}

              {/* Author block — F8.2: clickable author link */}
              <div className="flex items-center gap-3 mb-8 pb-7 border-b border-sand/60">
                {article.author?.id ? (
                  <Link
                    href={`/profiles/${article.author.id}`}
                    className="flex items-center gap-3 group flex-1 min-w-0"
                  >
                    {/* Avatar circle */}
                    <div className="w-10 h-10 rounded-full bg-obsidian flex items-center justify-center flex-shrink-0 group-hover:ring-2 group-hover:ring-gold/40 transition-all">
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
                        <p className="text-[13px] font-[family-name:var(--font-display)] font-bold text-obsidian leading-tight group-hover:text-gold transition-colors">
                          {article.author.name}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-0.5">
                        {publishedDate && (
                          <span className="flex items-center gap-1 text-[13px] font-[family-name:var(--font-display)] text-charcoal/40">
                            <Clock size={10} className="text-gold/60" />
                            {publishedDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar circle (no link) */}
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
                          <span className="flex items-center gap-1 text-[13px] font-[family-name:var(--font-display)] text-charcoal/40">
                            <Clock size={10} className="text-gold/60" />
                            {publishedDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Excerpt */}
              {article.excerpt && (
                <p
                  className="font-[family-name:var(--font-display)] font-semibold text-navy/80 mb-8 leading-loose"
                  style={{ fontSize: '1.15rem', lineHeight: 1.95, letterSpacing: '0.005em' }}
                >
                  {article.excerpt}
                </p>
              )}

              {/* AI TLDR summary — shown when a summary has been generated */}
              {article.summary && (
                <ArticleTldr summary={article.summary} summaryEn={article.summaryEn ?? undefined} />
              )}

              {/* Article body */}
              {isPaywalled ? (
                /* ── Paywalled: show truncated preview + fade + modal ── */
                <div className="relative">
                  {/* Truncated content */}
                  {isJsonContent ? (
                    <div className="article-body-slug" style={{ '--article-font-size': articleFontSize } as React.CSSProperties}>
                      <TipTapRenderer
                        content={truncatedJson ?? { type: 'doc', content: [] }}
                        className="article-body-slug-tiptap"
                      />
                    </div>
                  ) : (
                    <div
                      className="article-body-slug"
                      style={{ '--article-font-size': articleFontSize } as React.CSSProperties}
                      dangerouslySetInnerHTML={{ __html: addBidiIsolation(sanitizeArticleHtml(truncatedHtml ?? '')) }}
                    />
                  )}

                  {/* Fade-out gradient overlay */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to bottom, transparent, var(--color-paper, #F5EEDC))',
                    }}
                  />

                  {/* Paywall teaser label */}
                  <p className="mt-6 text-center text-[13px] font-[family-name:var(--font-display)] font-semibold text-charcoal/50 italic">
                    {t('article.paywalled_teaser')}
                  </p>

                  {/* Trigger paywall modal */}
                  <button
                    onClick={() => setPaywallOpen(true)}
                    className="block mx-auto mt-4 px-8 py-2.5 text-[13px] font-[family-name:var(--font-display)] font-black text-obsidian bg-gold hover:bg-gold-bright transition-colors rounded-sm tracking-wide"
                  >
                    اشترك الآن
                  </button>

                  <PaywallModal
                    isOpen={paywallOpen}
                    onClose={() => setPaywallOpen(false)}
                    articleCount={effectiveReadCount}
                    maxFreeArticles={freeArticleLimit}
                    reason="article_limit"
                    articleId={article.id}
                    articlePrice={article.articlePrice ?? paywallSettings?.singleArticleDefaultPrice}
                  />
                </div>
              ) : (
                /* ── Full content: TipTap JSON or legacy HTML ── */
                isJsonContent ? (
                  <div className="article-body-slug" style={{ '--article-font-size': articleFontSize } as React.CSSProperties}>
                    <TipTapRenderer
                      content={
                        typeof rawContent === 'string'
                          ? ((): JSONContent | null => {
                              try { return JSON.parse(rawContent); } catch { return null; }
                            })() ?? rawContent
                          : rawContent as JSONContent
                      }
                      className="article-body-slug-tiptap"
                    />
                  </div>
                ) : (
                  <div
                    className="article-body-slug"
                    style={{ '--article-font-size': articleFontSize } as React.CSSProperties}
                    dangerouslySetInnerHTML={{ __html: addBidiIsolation(sanitizeArticleHtml(rawContent as string)) }}
                  />
                )
              )}

              {/* Phase 6.4 — Live Blog */}
              <LiveBlog articleId={article.id} />

              {/* Phase 6.6 — Reader Polls */}
              <Poll articleId={article.id} />

              {/* Tags */}
              {article.tags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-12 pt-8 border-t border-sand/60">
                  <span className="flex items-center gap-1.5 text-[11px] font-[family-name:var(--font-display)] font-black text-charcoal/30 uppercase tracking-widest ml-2">
                    <Tag size={10} /> الوسوم
                  </span>
                  {article.tags.map((tag) => (
                    <a
                      key={tag}
                      href={`/tags/${encodeURIComponent(tag)}`}
                      className="px-3 py-1 text-[13px] font-[family-name:var(--font-display)] text-charcoal/50 border border-sand rounded-full hover:border-gold/50 hover:text-gold transition-all"
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              )}

              {/* Bottom share */}
              <div className="flex items-center gap-3 mt-8 pt-6 border-t border-sand/60">
                <span className="text-[13px] font-[family-name:var(--font-display)] text-charcoal/30">مشاركة المقال</span>
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

                  {/* Gift link — only shown to active subscribers on paywalled articles */}
                  {subscriptionTier !== 'free' && article.paywalled && (
                    <GiftArticleButton articleId={article.id} compact />
                  )}
                </div>
              </div>

              {/* Phase 6.2 — Related articles grid below content */}
              <RelatedArticles
                articleId={article.id}
                sectionSlug={article.section}
                limit={4}
              />

              {/* F2.2 — Comments section */}
              <ArticleComments articleId={article.id} />
            </motion.article>

            {/* ── Sidebar ── */}
            <motion.aside
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="sticky top-[calc(var(--header-offset-public)+1rem)] space-y-6">

                {/* Related articles — F2.5: semantic similar with AI indicator */}
                {relatedArticles.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-[3px] h-5 bg-gold flex-shrink-0" />
                      <h3 className="text-[13px] font-[family-name:var(--font-display)] font-black text-obsidian tracking-wide">
                        {t('article.related_ai')}
                      </h3>
                      {relatedIsAi && (
                        <Sparkles size={11} className="text-gold/60 flex-shrink-0" aria-label="مدعوم بالذكاء الاصطناعي" />
                      )}
                    </div>
                    <div className="space-y-0 divide-y divide-sand/50 border border-sand/60">
                      {relatedArticles.map((related) => (
                        <a
                          key={related.id}
                          href={`/${related.id}`}
                          className="flex gap-3 p-3.5 hover:bg-cream/60 transition-colors group"
                        >
                          {related.featuredImage ? (
                            <div className="relative w-[68px] h-[54px] flex-shrink-0 overflow-hidden">
                              <NextImage
                                src={related.featuredImage}
                                alt={related.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                sizes="68px"
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
                        href={`/industries/${article.sector}`}
                        className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 text-[13px] font-[family-name:var(--font-display)] font-bold text-charcoal/50 border border-sand/80 hover:border-gold hover:text-gold transition-all group rounded-sm"
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
                    <button className="w-full bg-gold text-obsidian py-2 text-[13px] font-[family-name:var(--font-display)] font-black tracking-wide hover:bg-gold-bright transition-colors">
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
          font-size: var(--article-font-size, 1.05rem);
          line-height: 2.05;
          color: #1E4A60;
        }
        /* Override TipTapRenderer dark-mode defaults for article reading context */
        .article-body-slug .article-body-slug-tiptap,
        .article-body-slug .article-body-slug-tiptap p,
        .article-body-slug .article-body-slug-tiptap li {
          color: #1E4A60;
        }
        .article-body-slug .article-body-slug-tiptap h1,
        .article-body-slug .article-body-slug-tiptap h2,
        .article-body-slug .article-body-slug-tiptap h3 {
          color: #0C1E2A;
          font-family: var(--font-display), system-ui, sans-serif;
        }
        .article-body-slug .article-body-slug-tiptap a {
          color: #C49240;
        }
        .article-body-slug .article-body-slug-tiptap a:hover {
          color: #DDA853;
        }
        .article-body-slug .article-body-slug-tiptap blockquote {
          border-inline-start: 3px solid #DDA853;
          border-top: 1px solid rgba(221,168,83,0.15);
          border-bottom: 1px solid rgba(221,168,83,0.15);
          border-inline-end: none;
          background: rgba(221,168,83,0.03);
          color: #183B4E;
        }
        .article-body-slug .article-body-slug-tiptap img {
          border: 1px solid #E8E0D0;
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
          border-inline-start: 3px solid #DDA853;
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
        .article-body-slug ul, .article-body-slug ol { padding-inline-start: 1.5rem; margin-bottom: 1.5rem; }
        .article-body-slug li { margin-bottom: 0.55rem; line-height: 1.9; }
        .article-body-slug ul li::marker { color: #DDA853; }
        .article-body-slug a { color: #C49240; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: rgba(196,146,64,0.3); }
        .article-body-slug a:hover { color: #DDA853; }
        .article-body-slug strong { font-weight: 700; color: #0C1E2A; }
        .article-body-slug em { color: #275A73; }
        .article-body-slug img { max-width: 100%; height: auto; margin: 2rem 0; border: 1px solid #E8E0D0; display: block; }
        .article-body-slug .video-embed-wrapper { position: relative; width: 100%; margin: 2rem 0; }
        .article-body-slug .video-embed-wrapper iframe { width: 100%; aspect-ratio: 16/9; border: none; display: block; }
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
    let rafId = 0;
    const update = () => {
      rafId = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
      });
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      cancelAnimationFrame(rafId);
    };
  }, []);
  return (
    <div className="fixed top-0 right-0 left-0 h-[3px] z-[100] bg-obsidian/5">
      <motion.div className="h-full bg-gold" style={{ scaleX: progress, transformOrigin: 'right center' }} initial={false} />
    </div>
  );
}
