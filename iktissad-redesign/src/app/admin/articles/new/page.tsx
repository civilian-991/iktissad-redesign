/**
 * Admin New Article Page
 * IKTISSAD Design System
 *
 * Article creation page with TipTap rich text editor and Supabase image upload.
 * Uses design tokens and i18n for internationalization.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Languages,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { Button } from '@/components/ui';
import RichTextEditor from '@/components/admin/RichTextEditor';
import ImageUploader from '@/components/admin/ImageUploader';
import MediaPicker from '@/components/admin/MediaPicker';
import { createArticle, updateArticle, aiTranslate, aiGenerateExcerpt, swrFetcher } from '@/lib/api-client';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const categoryKeys = ['economy', 'markets', 'companies', 'technology', 'investment', 'energy', 'realEstate', 'opinion'] as const;
const tagKeys = ['breaking', 'exclusive', 'analysis', 'report', 'interview', 'opinion', 'data', 'infographic'] as const;

type CategoryKey = typeof categoryKeys[number];
type TagKey = typeof tagKeys[number];
type ArticleStatus = 'draft' | 'review' | 'scheduled' | 'published';


// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function NewArticlePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CategoryKey | ''>('');
  const [selectedTags, setSelectedTags] = useState<TagKey[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ArticleStatus>('draft');
  const [scheduledDate, setScheduledDate] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: countriesRes } = useSWR<any>('/api/countries', swrFetcher, { revalidateOnFocus: false });
  const countries: { slug: string; name: string }[] = countriesRes?.data ?? [];
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingExcerpt, setIsGeneratingExcerpt] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // Auto-save state
  type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  // Store saved article id so subsequent auto-saves use PUT
  const savedArticleIdRef = useRef<string | null>(null);
  // Track content hash to avoid unnecessary saves
  const lastSavedHashRef = useRef<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Content hash for change detection
  const getContentHash = useCallback(() =>
    JSON.stringify({ title, excerpt, content, category, selectedTags, selectedCountry }),
    [title, excerpt, content, category, selectedTags, selectedCountry]
  );

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!title.trim()) return; // Don't save empty articles
    const hash = getContentHash();
    if (hash === lastSavedHashRef.current) return; // No changes

    setAutoSaveStatus('saving');
    try {
      if (savedArticleIdRef.current) {
        // Update existing draft
        await updateArticle(savedArticleIdRef.current, {
          title, titleEn, excerpt, content,
          sectionSlug: category || undefined,
          countrySlug: selectedCountry || undefined,
          tags: selectedTags,
          featuredImage: featuredImage || '',
          status: 'draft',
        });
      } else {
        // Create new draft
        const slug = title.trim().replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();
        const res = await createArticle({
          title, titleEn, slug, excerpt, content,
          sectionSlug: category || undefined,
          countrySlug: selectedCountry || undefined,
          tags: selectedTags,
          featuredImage: featuredImage || '',
          status: 'draft',
        });
        if (res.data?.id) {
          savedArticleIdRef.current = res.data.id;
        }
      }
      lastSavedHashRef.current = hash;
      setAutoSaveStatus('saved');
    } catch {
      setAutoSaveStatus('error');
    }
  }, [title, titleEn, excerpt, content, category, selectedTags, selectedCountry, featuredImage, getContentHash]);

  // Trigger auto-save 30s after last change
  useEffect(() => {
    if (!title.trim()) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('idle');
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 30_000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, titleEn, excerpt, content, category, selectedTags, selectedCountry, featuredImage, performAutoSave]);

  // Ref to access the TipTap editor's insertImage function
  const editorInsertImageRef = useRef<((url: string, alt?: string) => void) | null>(null);

  const toggleTag = (tag: TagKey) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async (saveStatus: ArticleStatus) => {
    if (!title.trim()) {
      toast.error(t('admin.articles.editor.titleRequired'));
      return;
    }
    setIsSaving(true);
    setStatus(saveStatus);
    try {
      const slug = title.trim().replace(/\s+/g, '-').toLowerCase();
      const res = await createArticle({
        title,
        titleEn,
        slug,
        excerpt,
        content,
        sectionSlug: category || undefined,
        countrySlug: selectedCountry || undefined,
        tags: selectedTags,
        featuredImage: featuredImage || '',
        status: saveStatus,
        publishedAt: saveStatus === 'published' ? new Date().toISOString() : scheduledDate || undefined,
      });
      toast.success(
        saveStatus === 'published'
          ? t('admin.articles.editor.publishSuccess')
          : t('admin.articles.editor.saveSuccess')
      );
      if (res.data?.id) {
        router.push(`/admin/articles/${res.data.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || t('admin.common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryName = (key: CategoryKey): string => {
    return t(`admin.articles.categories.${key}`);
  };

  const getTagName = (key: TagKey): string => {
    return t(`admin.articles.tags.${key}`);
  };

  // Handle image selection from MediaPicker for inline insertion
  const handleMediaSelect = useCallback((url: string, name?: string) => {
    if (editorInsertImageRef.current) {
      editorInsertImageRef.current(url, name);
    }
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

  const statusOptions = [
    { value: 'draft' as const, labelKey: 'draft', icon: FileText, color: 'text-white/60' },
    { value: 'review' as const, labelKey: 'review', icon: Clock, color: 'text-gold' },
    { value: 'published' as const, labelKey: 'published', icon: Send, color: 'text-profit' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/articles"
            className="p-2 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
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

          <Button
            variant={showPreview ? 'outline' : 'ghost'}
            size="md"
            leftIcon={<Eye size={iconSizes.md} />}
            onClick={() => setShowPreview(!showPreview)}
          >
            {t('admin.articles.editor.preview')}
          </Button>
          <Button
            variant="ghost"
            size="md"
            leftIcon={<FileText size={iconSizes.md} />}
            onClick={() => handleSave('draft')}
            disabled={isSaving}
          >
            {t('admin.articles.editor.saveDraft')}
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={
              isSaving ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Save size={iconSizes.md} />
                </motion.div>
              ) : (
                <Send size={iconSizes.md} />
              )
            }
            onClick={() => handleSave('published')}
            disabled={isSaving}
          >
            {t('admin.articles.editor.publish')}
          </Button>
        </div>
      </div>

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
                placeholder="العنوان بالإنجليزية (EN)"
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
                // Store JSON stringified for backward compat with the content field
                setContent(JSON.stringify(json));
              }}
              placeholder={t('admin.articles.editor.contentPlaceholder')}
              dir="rtl"
              minHeight={400}
              onImageInsert={() => setShowMediaPicker(true)}
            />
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
              hintText={t('admin.articles.editor.uploadImage')}
              formatHint={t('admin.articles.editor.imageFormats')}
            />
          </motion.div>

          {/* Category */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.sectionLabel')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryKey)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            >
              <option value="" className="bg-midnight">{t('admin.articles.editor.selectSection')}</option>
              {categoryKeys.map((cat) => (
                <option key={cat} value={cat} className="bg-midnight">
                  {getCategoryName(cat)}
                </option>
              ))}
            </select>
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
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            >
              <option value="" className="bg-midnight">-- اختر البلد --</option>
              {countries.map((c) => (
                <option key={c.slug} value={c.slug} className="bg-midnight">{c.name}</option>
              ))}
            </select>
          </motion.div>

          {/* Tags */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="flex items-center gap-2 text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              <Tag size={iconSizes.sm} />
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
                  {getTagName(tag)}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="flex items-center gap-2 text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              <Calendar size={iconSizes.sm} />
              {t('admin.articles.editor.scheduleLabel')}
            </label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            />
            <p className="text-white/40 text-xs mt-2 font-[family-name:var(--font-display)]">
              {t('admin.articles.editor.scheduleHint')}
            </p>
          </motion.div>

          {/* Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.statusLabel')}
            </label>
            <div className="space-y-2">
              {statusOptions.map((opt) => (
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
                    onChange={(e) => setStatus(e.target.value as ArticleStatus)}
                    className="sr-only"
                  />
                  <opt.icon size={iconSizes.md} className={opt.color} />
                  <span className={`font-[family-name:var(--font-display)] text-sm ${status === opt.value ? 'text-gold' : 'text-white/70'}`}>
                    {t(`admin.articles.status.${opt.labelKey}`)}
                  </span>
                </label>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Media Picker Modal - for inserting images into the editor */}
      <MediaPicker
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        bucket="articles"
        folder="content"
      />
    </div>
  );
}
