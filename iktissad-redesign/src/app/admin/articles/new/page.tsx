/**
 * Admin New Article Page
 * IKTISSAD Design System
 *
 * Article creation/editing page with rich text editor.
 * Uses design tokens and i18n for internationalization.
 */

'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  ArrowRight,
  Save,
  Eye,
  Clock,
  Image as ImageIcon,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Quote,
  Code,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Heading1,
  Heading2,
  Upload,
  X,
  Calendar,
  Tag,
  FileText,
  Send
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { Button, Badge, Input, Textarea } from '@/components/ui';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const categoryKeys = ['economy', 'markets', 'companies', 'technology', 'investment', 'energy', 'realEstate', 'opinion'] as const;
const tagKeys = ['breaking', 'exclusive', 'analysis', 'report', 'interview', 'opinion', 'data', 'infographic'] as const;

type CategoryKey = typeof categoryKeys[number];
type TagKey = typeof tagKeys[number];
type ArticleStatus = 'draft' | 'review' | 'scheduled' | 'published';

interface ToolbarButton {
  icon?: typeof Bold;
  labelKey?: string;
  divider?: boolean;
}

const toolbarButtonsConfig: ToolbarButton[] = [
  { icon: Bold, labelKey: 'bold' },
  { icon: Italic, labelKey: 'italic' },
  { icon: Underline, labelKey: 'underline' },
  { divider: true },
  { icon: Heading1, labelKey: 'heading1' },
  { icon: Heading2, labelKey: 'heading2' },
  { divider: true },
  { icon: List, labelKey: 'bulletList' },
  { icon: ListOrdered, labelKey: 'numberedList' },
  { divider: true },
  { icon: AlignRight, labelKey: 'alignRight' },
  { icon: AlignCenter, labelKey: 'alignCenter' },
  { icon: AlignLeft, labelKey: 'alignLeft' },
  { divider: true },
  { icon: Link2, labelKey: 'link' },
  { icon: Quote, labelKey: 'quote' },
  { icon: Code, labelKey: 'code' },
  { icon: ImageIcon, labelKey: 'image' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function NewArticlePage() {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CategoryKey | ''>('');
  const [selectedTags, setSelectedTags] = useState<TagKey[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ArticleStatus>('draft');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const toggleTag = (tag: TagKey) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async (saveStatus: ArticleStatus) => {
    setIsSaving(true);
    setStatus(saveStatus);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSaving(false);
  };

  // Get category name from translations
  const getCategoryName = (key: CategoryKey): string => {
    return t(`admin.articles.categories.${key}`);
  };

  // Get tag name from translations
  const getTagName = (key: TagKey): string => {
    return t(`admin.articles.tags.${key}`);
  };

  // Status options config
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
          </motion.div>

          {/* Excerpt */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.excerptLabel')}
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder={t('admin.articles.editor.excerptPlaceholder')}
              rows={3}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors resize-none"
            />
          </motion.div>

          {/* Content Editor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden"
          >
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-3 border-b border-gold/10 bg-white/5">
              {toolbarButtonsConfig.map((btn, index) =>
                btn.divider ? (
                  <div key={index} className="w-px h-6 bg-gold/10 mx-1" />
                ) : btn.icon ? (
                  <button
                    key={index}
                    title={t(`admin.articles.editor.toolbar.${btn.labelKey}`)}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <btn.icon size={iconSizes.md} />
                  </button>
                ) : null
              )}
            </div>

            {/* Editor */}
            <div className="p-6">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('admin.articles.editor.contentPlaceholder')}
                rows={20}
                className="w-full bg-transparent text-white font-[family-name:var(--font-body)] text-lg leading-relaxed placeholder:text-white/30 focus:outline-none resize-none"
              />
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Featured Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.featuredImage')}
            </label>
            {featuredImage ? (
              <div className="relative group">
                <img
                  src={featuredImage}
                  alt="Featured"
                  className="w-full aspect-video object-cover rounded-xl"
                />
                <button
                  onClick={() => setFeaturedImage(null)}
                  className="absolute top-2 left-2 p-1.5 bg-obsidian/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={iconSizes.md} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-gold/20 rounded-xl cursor-pointer hover:border-gold/40 transition-colors">
                <Upload className="text-gold/50 mb-2" size={32} />
                <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
                  {t('admin.articles.editor.uploadImage')}
                </span>
                <span className="text-white/30 text-xs mt-1">
                  {t('admin.articles.editor.imageFormats')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFeaturedImage(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            )}
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
    </div>
  );
}
