/**
 * Admin Edit Article Page
 * IKTISSAD Design System
 *
 * Article editing page with TipTap rich text editor and Supabase image upload.
 * Loads article data from API and saves via PUT /api/articles/[id].
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { use } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  ArrowRight,
  Save,
  Eye,
  Clock,
  Calendar,
  Tag,
  FileText,
  Send,
  Trash2,
  History,
  Loader2,
  Languages,
  Sparkles,
  Check,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import RichTextEditor from '@/components/admin/RichTextEditor';
import ImageUploader from '@/components/admin/ImageUploader';
import MediaPicker from '@/components/admin/MediaPicker';
import ArticleAnalyticsPanel from '@/components/admin/ArticleAnalyticsPanel';
import { swrFetcher, updateArticle, deleteArticle, aiTranslate, aiGenerateExcerpt } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';
import type { JSONContent } from '@tiptap/core';

const tagKeys = ['breaking', 'exclusive', 'analysis', 'report', 'interview', 'opinion', 'data', 'infographic'] as const;
type TagKey = typeof tagKeys[number];

const COUNTRY_REGIONS = [
  {
    id: 'gulf', name: 'الخليج',
    countries: [
      { id: 'saudi', name: 'السعودية' },
      { id: 'uae', name: 'الإمارات' },
      { id: 'qatar', name: 'قطر' },
      { id: 'kuwait', name: 'الكويت' },
      { id: 'bahrain', name: 'البحرين' },
      { id: 'oman', name: 'عُمان' },
    ],
  },
  {
    id: 'mashreq', name: 'المشرق العربي',
    countries: [
      { id: 'lebanon', name: 'لبنان' },
      { id: 'syria', name: 'سوريا' },
      { id: 'jordan', name: 'الأردن' },
      { id: 'iraq', name: 'العراق' },
    ],
  },
  {
    id: 'northafrica', name: 'شمال أفريقيا',
    countries: [
      { id: 'egypt', name: 'مصر' },
      { id: 'morocco', name: 'المغرب' },
      { id: 'algeria', name: 'الجزائر' },
      { id: 'tunisia', name: 'تونس' },
    ],
  },
  {
    id: 'world', name: 'العالم',
    countries: [
      { id: 'usa', name: 'أمريكا' },
      { id: 'china', name: 'الصين' },
      { id: 'europe', name: 'أوروبا' },
      { id: 'india', name: 'الهند' },
    ],
  },
] as const;

function findRegionForCountry(countryId: string): string {
  return COUNTRY_REGIONS.find((r) => r.countries.some((c) => c.id === countryId))?.id ?? '';
}

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();

  // Load article data from API
  const { data: articleRes, isLoading } = useSWR<ApiResponse<Article>>(
    `/api/articles/${id}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const article = articleRes?.data;

  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  // editorBody stores TipTap JSON for the new editor; falls back to content string
  const [editorBody, setEditorBody] = useState<JSONContent | null>(null);
  const [section, setSection] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'review' | 'scheduled' | 'published'>('draft');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingExcerpt, setIsGeneratingExcerpt] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Auto-save state
  type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const lastSavedHashRef = useRef<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getContentHash = useCallback(() =>
    JSON.stringify({ title, excerpt, content, section, selectedTags, selectedCountry }),
    [title, excerpt, content, section, selectedTags, selectedCountry]
  );

  const performAutoSave = useCallback(async () => {
    if (!title.trim()) return;
    const hash = getContentHash();
    if (hash === lastSavedHashRef.current) return;
    setAutoSaveStatus('saving');
    try {
      await updateArticle(id, {
        title, titleEn: '', excerpt, content,
        // Pass TipTap JSON body if available (new format)
        ...(editorBody ? { body: editorBody } : {}),
        section: section || undefined,
        country: selectedCountry || undefined,
        tags: selectedTags,
        featuredImage: featuredImage || '',
        status,
      });
      lastSavedHashRef.current = hash;
      setAutoSaveStatus('saved');
    } catch {
      setAutoSaveStatus('error');
    }
  }, [id, title, excerpt, content, editorBody, section, selectedTags, selectedCountry, featuredImage, status, getContentHash]);

  // Trigger auto-save 30s after last change (only after initialization)
  useEffect(() => {
    if (!initialized || !title.trim()) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('idle');
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 30_000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, excerpt, content, section, selectedTags, selectedCountry, featuredImage, initialized, performAutoSave]);

  // Populate form when article loads
  useEffect(() => {
    if (article && !initialized) {
      setTitle(article.title);
      setTitleEn(article.titleEn || '');
      setExcerpt(article.excerpt);
      setContent(article.content);
      setSection(article.section || '');
      setSelectedTags(article.tags || []);
      setFeaturedImage(article.featuredImage || null);
      setStatus(article.status);
      if (article.country) {
        setSelectedCountry(article.country);
        setSelectedRegion(findRegionForCountry(article.country));
      }
      setInitialized(true);
    }
  }, [article, initialized]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('admin.articles.editor.titleRequired'));
      return;
    }
    setIsSaving(true);
    try {
      await updateArticle(id, {
        title,
        titleEn,
        excerpt,
        content,
        // Pass TipTap JSON body if editor has produced output
        ...(editorBody ? { body: editorBody } : {}),
        section: section || undefined,
        country: selectedCountry || undefined,
        tags: selectedTags,
        featuredImage: featuredImage || '',
        status,
      });
      toast.success(t('admin.articles.editor.saveSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('admin.common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteArticle(id);
      toast.success(t('admin.articles.actions.deleted'));
      router.push('/admin/articles');
    } catch (err: any) {
      toast.error(err.message || t('admin.common.error'));
    }
  };

  // Handle image selection from MediaPicker for inline editor insertion
  const handleMediaSelect = useCallback((url: string) => {
    // The RichTextEditor should provide a way to insert images
  }, []);

  const handleTranslateTitle = async () => {
    if (!title.trim()) {
      toast.error(t('admin.articles.editor.ai.noTitle'));
      return;
    }
    setIsTranslating(true);
    try {
      const res = await aiTranslate(title, 'ar', 'en');
      if (res.data?.translatedText) {
        setTitleEn(res.data.translatedText);
        toast.success(t('admin.articles.editor.ai.translateSuccess'));
      }
    } catch (err: any) {
      toast.error(err.message || t('admin.articles.editor.ai.translateError'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateExcerpt = async () => {
    if (!content.trim()) {
      toast.error(t('admin.articles.editor.ai.noContent'));
      return;
    }
    setIsGeneratingExcerpt(true);
    try {
      const res = await aiGenerateExcerpt(content, 'ar');
      if (res.data?.excerpt) {
        setExcerpt(res.data.excerpt);
        toast.success(t('admin.articles.editor.ai.excerptSuccess'));
      }
    } catch (err: any) {
      toast.error(err.message || t('admin.articles.editor.ai.excerptError'));
    } finally {
      setIsGeneratingExcerpt(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-32">
        <FileText size={48} className="mx-auto text-white/20 mb-4" />
        <p className="text-white/40 font-[family-name:var(--font-display)]">
          {t('admin.articles.notFound')}
        </p>
        <Link href="/admin/articles" className="text-gold hover:underline mt-4 inline-block font-[family-name:var(--font-display)]">
          {t('common.actions.back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/articles"
            className="p-2 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
              {t('admin.articles.editor.editArticle')}
            </h1>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              #{id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-save indicator */}
          {autoSaveStatus === 'saving' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/50 font-[family-name:var(--font-display)]">
              <Loader2 size={12} className="animate-spin" />
              {t('admin.editor.autoSaving')}
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-profit font-[family-name:var(--font-display)]">
              <Check size={12} />
              {t('admin.editor.autoSaved')}
            </span>
          )}
          {autoSaveStatus === 'error' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-loss font-[family-name:var(--font-display)]">
              <AlertCircle size={12} />
              {t('admin.editor.saveFailed')}
              <button onClick={performAutoSave} className="underline hover:no-underline flex items-center gap-1">
                <RefreshCcw size={10} />
                {t('admin.editor.retry')}
              </button>
            </span>
          )}

          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-loss/10 border border-loss/20 rounded-xl text-loss hover:bg-loss/20 transition-all font-[family-name:var(--font-display)] text-sm"
          >
            <Trash2 size={16} />
            {t('admin.articles.actions.delete')}
          </button>
          <a
            href={`/news/${article.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-[family-name:var(--font-display)] text-sm"
          >
            <Eye size={16} />
            {t('admin.articles.actions.preview')}
          </a>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Save size={16} />
              </motion.div>
            ) : (
              <Save size={16} />
            )}
            {t('admin.articles.editor.saveChanges')}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: t('admin.articles.table.stats'), value: article.views.toLocaleString(), icon: Eye, color: 'text-gold' },
          { label: t('admin.articles.table.date'), value: article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory') : '-', icon: Calendar, color: 'text-teal' },
          { label: t('admin.articles.table.status'), value: t(`admin.articles.status.${article.status}`), icon: Send, color: 'text-profit' },
          { label: t('admin.articles.table.section'), value: article.section || '-', icon: FileText, color: 'text-purple-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-midnight/50 border border-gold/10 rounded-xl p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">{stat.label}</p>
              <p className="text-white font-[family-name:var(--font-display)] font-semibold">{stat.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.titleLabel')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('admin.articles.editor.titlePlaceholder')}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-4 px-5 text-white text-xl font-[family-name:var(--font-display)] font-bold placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            {/* English title + AI translate button */}
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="English title (EN)"
                className="flex-1 bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
              />
              <button
                onClick={handleTranslateTitle}
                disabled={isTranslating || !title.trim()}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border border-gold/20 rounded-xl text-gold text-xs font-[family-name:var(--font-display)] hover:bg-gold/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                title={t('admin.articles.editor.ai.translateTitle')}
              >
                {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
                {isTranslating ? t('admin.articles.editor.ai.translating') : t('admin.articles.editor.ai.translateTitle')}
              </button>
            </div>
          </motion.div>

          {/* Excerpt */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)]">
                {t('admin.articles.editor.excerptLabel')}
              </label>
              <button
                onClick={handleGenerateExcerpt}
                disabled={isGeneratingExcerpt || !content.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-gold/20 rounded-lg text-gold text-xs font-[family-name:var(--font-display)] hover:bg-gold/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('admin.articles.editor.ai.generateExcerpt')}
              >
                {isGeneratingExcerpt ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isGeneratingExcerpt ? t('admin.articles.editor.ai.generatingExcerpt') : t('admin.articles.editor.ai.generateExcerpt')}
              </button>
            </div>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder={t('admin.articles.editor.excerptPlaceholder')}
              rows={3}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors resize-none"
            />
          </motion.div>

          {/* Content Editor - TipTap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <RichTextEditor
              value={content}
              onChange={(json) => {
                setEditorBody(json);
              }}
              placeholder={t('admin.articles.editor.contentPlaceholder')}
              dir="rtl"
              minHeight={400}
              onImageInsert={() => setShowMediaPicker(true)}
            />
          </motion.div>

          {/* Article Analytics — collapsible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ArticleAnalyticsPanel articleId={id} />
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Featured Image - Supabase Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.featuredImage')}
            </label>
            <ImageUploader
              bucket="articles"
              folder="featured"
              currentImage={featuredImage}
              onUpload={(url) => setFeaturedImage(url)}
              onRemove={() => setFeaturedImage(null)}
            />
          </motion.div>

          {/* Country / بلدان */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              بلدان
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => { setSelectedRegion(e.target.value); setSelectedCountry(''); }}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors mb-3"
            >
              <option value="" className="bg-midnight">-- اختر المنطقة --</option>
              {COUNTRY_REGIONS.map((r) => (
                <option key={r.id} value={r.id} className="bg-midnight">{r.name}</option>
              ))}
            </select>
            {selectedRegion && (
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
              >
                <option value="" className="bg-midnight">-- اختر البلد --</option>
                {COUNTRY_REGIONS.find((r) => r.id === selectedRegion)?.countries.map((c) => (
                  <option key={c.id} value={c.id} className="bg-midnight">{c.name}</option>
                ))}
              </select>
            )}
          </motion.div>

          {/* Tags */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="flex items-center gap-2 text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              <Tag size={14} />
              {t('admin.articles.editor.tagsLabel')}
            </label>
            <div className="flex flex-wrap gap-2">
              {tagKeys.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-gold text-obsidian'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-gold/10'
                  }`}
                >
                  {t(`admin.articles.tags.${tag}`)}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.statusLabel')}
            </label>
            <div className="space-y-2">
              {[
                { value: 'draft' as const, labelKey: 'draft', icon: FileText, color: 'text-white/60' },
                { value: 'review' as const, labelKey: 'review', icon: Clock, color: 'text-gold' },
                { value: 'published' as const, labelKey: 'published', icon: Send, color: 'text-profit' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    status === opt.value
                      ? 'bg-gold/10 border border-gold/30'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={status === opt.value}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="sr-only"
                  />
                  <opt.icon size={16} className={opt.color} />
                  <span className={`font-[family-name:var(--font-display)] text-sm ${status === opt.value ? 'text-gold' : 'text-white/70'}`}>
                    {t(`admin.articles.status.${opt.labelKey}`)}
                  </span>
                </label>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPicker
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        bucket="articles"
        folder="content"
      />

      {/* Delete Modal */}
      {showDeleteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-midnight border border-gold/10 rounded-2xl p-6 max-w-md w-full"
          >
            <div className="w-12 h-12 bg-loss/10 rounded-xl flex items-center justify-center mb-4">
              <Trash2 className="text-loss" size={24} />
            </div>
            <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-white mb-2">
              {t('admin.articles.deleteModal.title')}
            </h3>
            <p className="text-white/60 text-sm font-[family-name:var(--font-display)] mb-6">
              {t('admin.articles.deleteModal.message')}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-xl font-[family-name:var(--font-display)] text-sm hover:bg-white/10 transition-colors"
              >
                {t('common.actions.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-loss text-white rounded-xl font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-loss/90 transition-colors"
              >
                {t('admin.articles.actions.delete')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
