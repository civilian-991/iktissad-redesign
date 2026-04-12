'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRight, Save, Eye, Clock, Calendar, Tag, FileText, Send,
  Languages, Sparkles, Loader2, Check, AlertCircle, RefreshCcw,
  Star, Zap, User, Link as LinkIcon, X, Plus,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import dynamic from 'next/dynamic';
import ImageUploader from '@/components/admin/ImageUploader';
import MediaPicker from '@/components/admin/MediaPicker';
import FocalPointSelector from '@/components/admin/spread-editor/FocalPointSelector';
import TemplateSelector from '@/components/admin/TemplateSelector';
import { createArticle, updateArticle, aiTranslate, aiGenerateExcerpt, swrFetcher } from '@/lib/api-client';
import type { JSONContent } from '@tiptap/core';

// TipTap editor is large (~500KB). Dynamic import keeps it out of the initial bundle.
const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-stone-50 border border-stone-200 rounded-lg animate-pulse flex items-center justify-center">
      <Loader2 className="text-stone-400 animate-spin" size={24} />
    </div>
  ),
});

const tagKeys = ['breaking', 'exclusive', 'analysis', 'report', 'interview', 'opinion', 'data', 'infographic'] as const;
type TagKey = typeof tagKeys[number];
type ArticleStatus = 'draft' | 'review' | 'scheduled' | 'published';

export default function NewArticlePage() {
  const { t } = useTranslation();
  const router = useRouter();

  // ── Core fields ────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [deck, setDeck] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [excerptEn, setExcerptEn] = useState('');
  const [content, setContent] = useState('');
  const [editorBody, setEditorBody] = useState<JSONContent | null>(null);

  // ── Media ──────────────────────────────────────────────────────
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [focalX, setFocalX] = useState(0.5);
  const [focalY, setFocalY] = useState(0.5);

  // ── Classification ─────────────────────────────────────────────
  const [section, setSection] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // ── Status & scheduling ────────────────────────────────────────
  const [status, setStatus] = useState<ArticleStatus>('draft');
  const [scheduledAt, setScheduledAt] = useState('');

  // ── Flags ──────────────────────────────────────────────────────
  const [featured, setFeatured] = useState(false);
  const [editorChoice, setEditorChoice] = useState(false);
  const [isBreaking, setIsBreaking] = useState(false);

  // ── SEO ───────────────────────────────────────────────────────
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [noIndex, setNoIndex] = useState(false);

  // ── Remote data ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sectionsRes } = useSWR<any>('/api/sections', swrFetcher, { revalidateOnFocus: false });
  const sections: { slug: string; name: string }[] = sectionsRes?.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sectorsRes } = useSWR<any>('/api/sectors', swrFetcher, { revalidateOnFocus: false });
  const sectors: { slug: string; name: string }[] = sectorsRes?.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: countriesRes } = useSWR<any>('/api/countries', swrFetcher, { revalidateOnFocus: false });
  const countries: { slug: string; name: string }[] = countriesRes?.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usersRes } = useSWR<any>('/api/users', swrFetcher, { revalidateOnFocus: false });
  const users: { id: string; name: string }[] = usersRes?.data ?? [];

  // ── UI state ───────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingExcerpt, setIsGeneratingExcerpt] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const editorInsertImageRef = useRef<((url: string, alt?: string) => void) | null>(null);

  // ── Auto-save ──────────────────────────────────────────────────
  type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const savedArticleIdRef = useRef<string | null>(null);
  const lastSavedHashRef = useRef<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-generate slug from title (unless manually edited)
  useEffect(() => {
    if (!slugManual && title) {
      setSlug(title.trim().replace(/\s+/g, '-').toLowerCase() + '-' + Date.now());
    }
  }, [title, slugManual]);

  const buildPayload = useCallback(() => ({
    title,
    titleEn,
    slug: slug || title.trim().replace(/\s+/g, '-').toLowerCase() + '-' + Date.now(),
    deck: deck || undefined,
    excerpt,
    excerptEn: excerptEn || undefined,
    content,
    ...(editorBody ? { body: editorBody } : {}),
    featuredImage: featuredImage || '',
    featuredImageFocalX: focalX,
    featuredImageFocalY: focalY,
    sectionSlug: section || undefined,
    sectorSlug: selectedSector || undefined,
    countrySlug: selectedCountry || undefined,
    authorId: selectedAuthorId || undefined,
    tags: selectedTags,
    status,
    publishedAt: status === 'scheduled' && scheduledAt ? scheduledAt
      : status === 'published' ? new Date().toISOString()
      : undefined,
    featured,
    editorChoice,
    isBreaking,
    metaTitle: metaTitle || undefined,
    metaDescription: metaDescription || undefined,
    ogImage: ogImage || undefined,
    canonicalUrl: canonicalUrl || undefined,
    noIndex,
  }), [title, titleEn, slug, deck, excerpt, excerptEn, content, editorBody, featuredImage, focalX, focalY, section, selectedSector, selectedCountry, selectedAuthorId, selectedTags, status, scheduledAt, featured, editorChoice, isBreaking, metaTitle, metaDescription, ogImage, canonicalUrl, noIndex]);

  const getContentHash = useCallback(() =>
    JSON.stringify({ title, titleEn, slug, deck, excerpt, excerptEn, content, section, selectedSector, selectedCountry, selectedAuthorId, selectedTags, featured, editorChoice, isBreaking, scheduledAt }),
    [title, titleEn, slug, deck, excerpt, excerptEn, content, section, selectedSector, selectedCountry, selectedAuthorId, selectedTags, featured, editorChoice, isBreaking, scheduledAt]
  );

  const performAutoSave = useCallback(async () => {
    if (!title.trim()) return;
    const hash = getContentHash();
    if (hash === lastSavedHashRef.current) return;
    setAutoSaveStatus('saving');
    try {
      const payload = buildPayload();
      if (savedArticleIdRef.current) {
        await updateArticle(savedArticleIdRef.current, payload);
      } else {
        const res = await createArticle(payload);
        if (res.data?.id) savedArticleIdRef.current = res.data.id;
      }
      lastSavedHashRef.current = hash;
      setAutoSaveStatus('saved');
    } catch {
      setAutoSaveStatus('error');
    }
  }, [title, buildPayload, getContentHash]);

  useEffect(() => {
    if (!title.trim()) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('idle');
    autoSaveTimerRef.current = setTimeout(performAutoSave, 30_000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [title, titleEn, slug, deck, excerpt, excerptEn, content, section, selectedSector, selectedCountry, selectedAuthorId, selectedTags, featured, editorChoice, isBreaking, scheduledAt, performAutoSave]);

  const handleSave = async (saveStatus: ArticleStatus) => {
    if (!title.trim()) {
      toast.error(t('admin.articles.editor.titleRequired'));
      return;
    }
    setIsSaving(true);
    setStatus(saveStatus);
    try {
      const payload = { ...buildPayload(), status: saveStatus };
      let articleId: string | undefined;
      if (savedArticleIdRef.current) {
        await updateArticle(savedArticleIdRef.current, payload);
        articleId = savedArticleIdRef.current;
      } else {
        const res = await createArticle(payload);
        articleId = res.data?.id;
        if (articleId) savedArticleIdRef.current = articleId;
      }
      toast.success(saveStatus === 'published'
        ? t('admin.articles.editor.publishSuccess')
        : t('admin.articles.editor.saveSuccess'));
      if (articleId) router.push(`/admin/articles/${articleId}`);
    } catch (err: unknown) {
      toast.error((err as Error).message || t('admin.common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    const tag = customTagInput.trim();
    if (tag && !selectedTags.includes(tag)) setSelectedTags((prev) => [...prev, tag]);
    setCustomTagInput('');
  };

  const handleTranslateTitle = async () => {
    if (!title.trim()) { toast.error(t('admin.articles.editor.ai.noTitle')); return; }
    setIsTranslating(true);
    try {
      const res = await aiTranslate(title, 'ar', 'en');
      if (res.data?.translatedText) { setTitleEn(res.data.translatedText); toast.success(t('admin.articles.editor.ai.translateSuccess')); }
    } catch (err: unknown) { toast.error((err as Error).message || t('admin.articles.editor.ai.translateError')); }
    finally { setIsTranslating(false); }
  };

  const handleGenerateExcerpt = async () => {
    if (!content.trim()) { toast.error(t('admin.articles.editor.ai.noContent')); return; }
    setIsGeneratingExcerpt(true);
    try {
      const res = await aiGenerateExcerpt(content, 'ar');
      if (res.data?.excerpt) { setExcerpt(res.data.excerpt); toast.success(t('admin.articles.editor.ai.excerptSuccess')); }
    } catch (err: unknown) { toast.error((err as Error).message || t('admin.articles.editor.ai.excerptError')); }
    finally { setIsGeneratingExcerpt(false); }
  };

  const metaTitleLen = metaTitle.length;
  const metaDescLen = metaDescription.length;
  const displaySlug = slug.replace(/-\d{13}$/, ''); // hide timestamp suffix from display

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/articles" className="p-2 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <ArrowRight size={iconSizes.lg} />
          </Link>
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
              {t('admin.articles.editor.newArticle')}
            </h1>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              {t('admin.articles.editor.createDesc')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {autoSaveStatus === 'saving' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/50 font-[family-name:var(--font-display)]">
              <Loader2 size={12} className="animate-spin" />{t('admin.editor.autoSaving')}
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-profit font-[family-name:var(--font-display)]">
              <Check size={12} />{t('admin.editor.autoSaved')}
            </span>
          )}
          {autoSaveStatus === 'error' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-loss font-[family-name:var(--font-display)]">
              <AlertCircle size={12} />{t('admin.editor.saveFailed')}
              <button onClick={performAutoSave} className="underline hover:no-underline flex items-center gap-1">
                <RefreshCcw size={10} />{t('admin.editor.retry')}
              </button>
            </span>
          )}
          <button
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white text-sm font-[family-name:var(--font-display)] transition-colors disabled:opacity-50"
          >
            <FileText size={iconSizes.sm} />{t('admin.articles.editor.saveDraft')}
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-xl text-sm font-[family-name:var(--font-display)] font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={iconSizes.sm} className="animate-spin" /> : <Send size={iconSizes.sm} />}
            {t('admin.articles.editor.publish')}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Title */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.titleLabel')}
            </label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={t('admin.articles.editor.titlePlaceholder')}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-4 px-5 text-white text-xl font-[family-name:var(--font-display)] font-bold placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)}
                placeholder="English title"
                className="flex-1 bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
              />
              <button onClick={handleTranslateTitle} disabled={isTranslating || !title.trim()}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border border-gold/20 rounded-xl text-gold text-xs font-[family-name:var(--font-display)] hover:bg-gold/10 transition-all disabled:opacity-40 whitespace-nowrap">
                {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
                {isTranslating ? t('admin.articles.editor.ai.translating') : t('admin.articles.editor.ai.translateTitle')}
              </button>
            </div>
          </motion.div>

          {/* Slug + Deck */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                Slug (URL)
              </label>
              <div className="flex items-center gap-2 bg-white/5 border border-gold/10 rounded-xl px-4 py-2.5">
                <LinkIcon size={14} className="text-white/30 flex-shrink-0" />
                <input
                  type="text" value={displaySlug}
                  onChange={(e) => { setSlugManual(true); setSlug(e.target.value); }}
                  placeholder="article-slug"
                  className="flex-1 bg-transparent text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none ltr"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                Deck (مقدمة)
              </label>
              <input
                type="text" value={deck} onChange={(e) => setDeck(e.target.value)}
                placeholder="جملة افتتاحية قصيرة تظهر تحت العنوان..."
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>
          </motion.div>

          {/* Excerpt */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)]">
                {t('admin.articles.editor.excerptLabel')}
              </label>
              <button onClick={handleGenerateExcerpt} disabled={isGeneratingExcerpt || !content.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-gold/20 rounded-lg text-gold text-xs font-[family-name:var(--font-display)] hover:bg-gold/10 transition-all disabled:opacity-40">
                {isGeneratingExcerpt ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isGeneratingExcerpt ? t('admin.articles.editor.ai.generatingExcerpt') : t('admin.articles.editor.ai.generateExcerpt')}
              </button>
            </div>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
              placeholder={t('admin.articles.editor.excerptPlaceholder')} rows={3}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors resize-none"
            />
            <input type="text" value={excerptEn} onChange={(e) => setExcerptEn(e.target.value)}
              placeholder="English excerpt"
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
          </motion.div>

          {/* Phase 6.7 — Template Selector */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <TemplateSelector
              onSelect={(body) => {
                if (body) {
                  setEditorBody(body as JSONContent);
                  setContent(JSON.stringify(body));
                }
              }}
            />
          </motion.div>

          {/* Content Editor */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <RichTextEditor
              value={content}
              onChange={(json) => {
                setEditorBody(json);
                setContent(JSON.stringify(json));
              }}
              placeholder={t('admin.articles.editor.contentPlaceholder')}
              dir="rtl"
              minHeight={400}
              onImageInsert={() => setShowMediaPicker(true)}
              onEditorMount={(editor) => {
                editorInsertImageRef.current = (url, alt) => {
                  editor.chain().focus().setImage({ src: url, alt: alt ?? '' }).run();
                };
              }}
            />
          </motion.div>

          {/* SEO Metadata */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4">
            <h3 className="text-white font-[family-name:var(--font-display)] font-semibold text-sm flex items-center gap-2">
              <Eye size={14} className="text-gold" /> SEO
            </h3>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-white/60 text-xs font-[family-name:var(--font-display)]">Meta Title</label>
                <span className={`text-xs font-[family-name:var(--font-display)] ${metaTitleLen > 65 ? 'text-loss' : 'text-white/40'}`}>{metaTitleLen}/65</span>
              </div>
              <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title || 'سيستخدم عنوان المقال تلقائياً'}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-white/60 text-xs font-[family-name:var(--font-display)]">Meta Description</label>
                <span className={`text-xs font-[family-name:var(--font-display)] ${metaDescLen > 160 ? 'text-loss' : 'text-white/40'}`}>{metaDescLen}/160</span>
              </div>
              <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={2} placeholder={excerpt || 'سيستخدم المقتطف تلقائياً'}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors resize-none" />
            </div>
            <div>
              <label className="text-white/60 text-xs font-[family-name:var(--font-display)] block mb-1">OG Image URL</label>
              <input type="text" value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://..."
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors" dir="ltr" />
            </div>
            <div>
              <label className="text-white/60 text-xs font-[family-name:var(--font-display)] block mb-1">Canonical URL</label>
              <input type="text" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://..."
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors" dir="ltr" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setNoIndex(!noIndex)}
                className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${noIndex ? 'bg-loss' : 'bg-white/10'}`}>
                <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${noIndex ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-white/60 text-xs font-[family-name:var(--font-display)]">No Index (لا تُظهر في محركات البحث)</span>
            </label>
          </motion.div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">

          {/* Featured Image */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.featuredImage')}
            </label>
            <ImageUploader bucket="articles" folder="featured" currentImage={featuredImage}
              onUpload={(url) => setFeaturedImage(url)} onRemove={() => setFeaturedImage(null)}
              hintText={t('admin.articles.editor.uploadImage')} formatHint={t('admin.articles.editor.imageFormats')} />
            {featuredImage && (
              <div className="mt-4">
                <p className="text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">Focal Point</p>
                <FocalPointSelector imageUrl={featuredImage} focalX={focalX} focalY={focalY}
                  onChange={(x, y) => { setFocalX(x); setFocalY(y); }} />
              </div>
            )}
          </motion.div>

          {/* Status */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.statusLabel')}
            </label>
            <div className="space-y-2">
              {([
                { value: 'draft', icon: FileText, label: t('admin.articles.status.draft'), color: 'text-white/60' },
                { value: 'review', icon: Clock, label: t('admin.articles.status.review'), color: 'text-gold' },
                { value: 'scheduled', icon: Calendar, label: t('admin.articles.status.scheduled'), color: 'text-blue-400' },
                { value: 'published', icon: Send, label: t('admin.articles.status.published'), color: 'text-profit' },
              ] as const).map((opt) => (
                <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${status === opt.value ? 'bg-gold/10 border border-gold/30' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}>
                  <input type="radio" name="status" value={opt.value} checked={status === opt.value}
                    onChange={() => setStatus(opt.value)} className="sr-only" />
                  <opt.icon size={iconSizes.md} className={opt.color} />
                  <span className={`font-[family-name:var(--font-display)] text-sm ${status === opt.value ? 'text-gold' : 'text-white/70'}`}>{opt.label}</span>
                </label>
              ))}
            </div>
            {status === 'scheduled' && (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-3 w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors" />
            )}
          </motion.div>

          {/* Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.sectionLabel')}
            </label>
            <select value={section} onChange={(e) => setSection(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors">
              <option value="" className="bg-midnight">{t('admin.articles.editor.selectSection')}</option>
              {sections.map((s) => <option key={s.slug} value={s.slug} className="bg-midnight">{s.name}</option>)}
            </select>
          </motion.div>

          {/* Sector */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">القطاع</label>
            <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors">
              <option value="" className="bg-midnight">اختر القطاع</option>
              {sectors.map((s) => <option key={s.slug} value={s.slug} className="bg-midnight">{s.name}</option>)}
            </select>
          </motion.div>

          {/* Country */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.countryLabel')}
            </label>
            <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors">
              <option value="" className="bg-midnight">{t('admin.articles.editor.selectCountry')}</option>
              {countries.map((c) => <option key={c.slug} value={c.slug} className="bg-midnight">{c.name}</option>)}
            </select>
          </motion.div>

          {/* Author */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
            <label className="flex items-center gap-2 text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              <User size={iconSizes.sm} /> الكاتب
            </label>
            <select value={selectedAuthorId} onChange={(e) => setSelectedAuthorId(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors">
              <option value="" className="bg-midnight">اختر الكاتب</option>
              {users.map((u) => <option key={u.id} value={u.id} className="bg-midnight">{u.name}</option>)}
            </select>
          </motion.div>

          {/* Tags */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
            <label className="flex items-center gap-2 text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              <Tag size={iconSizes.sm} /> {t('admin.articles.editor.tagsLabel')}
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tagKeys.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-[family-name:var(--font-display)] transition-all ${selectedTags.includes(tag) ? 'bg-gold text-obsidian' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-gold/10'}`}>
                  {t(`admin.articles.tags.${tag}`)}
                </button>
              ))}
            </div>
            {selectedTags.filter((t) => !tagKeys.includes(t as TagKey)).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gold/15 text-gold text-xs font-[family-name:var(--font-display)] me-1.5 mb-1.5">
                {tag}
                <button onClick={() => toggleTag(tag)}><X size={10} /></button>
              </span>
            ))}
            <div className="flex gap-2 mt-2">
              <input type="text" value={customTagInput} onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                placeholder="وسم مخصص..."
                className="flex-1 bg-white/5 border border-gold/10 rounded-lg py-2 px-3 text-white text-xs font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors" />
              <button onClick={addCustomTag} disabled={!customTagInput.trim()}
                className="p-2 bg-gold/10 border border-gold/20 rounded-lg text-gold hover:bg-gold/20 transition-colors disabled:opacity-40">
                <Plus size={14} />
              </button>
            </div>
          </motion.div>

          {/* Flags */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-3">
            <h3 className="text-white/70 text-sm font-[family-name:var(--font-display)]">خيارات العرض</h3>
            {([
              { state: featured, set: setFeatured, label: 'مقال مميز', icon: Star },
              { state: editorChoice, set: setEditorChoice, label: 'اختيار المحرر', icon: Eye },
              { state: isBreaking, set: setIsBreaking, label: 'خبر عاجل', icon: Zap },
            ] as const).map(({ state, set, label, icon: Icon }) => (
              <button key={label} onClick={() => set(!state)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${state ? 'border-gold/30 bg-gold/10' : 'border-gold/10 bg-white/5 hover:bg-white/10'}`}>
                <span className={`flex items-center gap-2 text-sm font-[family-name:var(--font-display)] ${state ? 'text-gold' : 'text-white/60'}`}>
                  <Icon size={14} />{label}
                </span>
                <div className={`w-8 h-4 rounded-full transition-colors ${state ? 'bg-gold' : 'bg-white/20'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${state ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>
            ))}
          </motion.div>

          {/* Save actions (repeated at bottom for long pages) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col gap-3">
            <button onClick={() => handleSave('draft')} disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white text-sm font-[family-name:var(--font-display)] transition-colors disabled:opacity-50">
              <Save size={iconSizes.sm} />{t('admin.articles.editor.saveDraft')}
            </button>
            <button onClick={() => handleSave('review')} disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-gold/20 rounded-xl text-gold text-sm font-[family-name:var(--font-display)] hover:bg-gold/10 transition-colors disabled:opacity-50">
              <Clock size={iconSizes.sm} />{t('admin.articles.status.review')}
            </button>
            <button onClick={() => handleSave('published')} disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gold text-obsidian rounded-xl text-sm font-[family-name:var(--font-display)] font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50">
              {isSaving ? <Loader2 size={iconSizes.sm} className="animate-spin" /> : <Send size={iconSizes.sm} />}
              {t('admin.articles.editor.publish')}
            </button>
          </motion.div>
        </div>
      </div>

      <MediaPicker open={showMediaPicker} onClose={() => setShowMediaPicker(false)}
        onSelect={(url, name) => { if (editorInsertImageRef.current) editorInsertImageRef.current(url, name); }}
        bucket="articles" folder="content" />
    </div>
  );
}
