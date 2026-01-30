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

const categories = [
  'اقتصاد',
  'أسواق',
  'شركات',
  'تكنولوجيا',
  'استثمار',
  'طاقة',
  'عقار',
  'رأي',
];

const tags = [
  'عاجل',
  'حصري',
  'تحليل',
  'تقرير',
  'مقابلة',
  'رأي',
  'بيانات',
  'انفوجرافيك',
];

export default function NewArticlePage() {
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'review' | 'scheduled' | 'published'>('draft');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async (saveStatus: typeof status) => {
    setIsSaving(true);
    setStatus(saveStatus);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSaving(false);
  };

  const toolbarButtons = [
    { icon: Bold, label: 'عريض' },
    { icon: Italic, label: 'مائل' },
    { icon: Underline, label: 'تسطير' },
    { divider: true },
    { icon: Heading1, label: 'عنوان رئيسي' },
    { icon: Heading2, label: 'عنوان فرعي' },
    { divider: true },
    { icon: List, label: 'قائمة نقطية' },
    { icon: ListOrdered, label: 'قائمة مرقمة' },
    { divider: true },
    { icon: AlignRight, label: 'محاذاة يمين' },
    { icon: AlignCenter, label: 'محاذاة وسط' },
    { icon: AlignLeft, label: 'محاذاة يسار' },
    { divider: true },
    { icon: Link2, label: 'رابط' },
    { icon: Quote, label: 'اقتباس' },
    { icon: Code, label: 'كود' },
    { icon: ImageIcon, label: 'صورة' },
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
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
              مقال جديد
            </h1>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              إنشاء وتحرير مقال جديد
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all font-[family-name:var(--font-display)] text-sm ${
              showPreview
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-white/5 border-gold/10 text-white/70 hover:text-white'
            }`}
          >
            <Eye size={16} />
            معاينة
          </button>
          <button
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-[family-name:var(--font-display)] text-sm disabled:opacity-50"
          >
            <FileText size={16} />
            حفظ مسودة
          </button>
          <button
            onClick={() => handleSave('published')}
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
              <Send size={16} />
            )}
            نشر المقال
          </button>
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
              عنوان المقال
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="أدخل عنوان المقال هنا..."
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
              الملخص
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="ملخص قصير للمقال يظهر في القوائم..."
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
              {toolbarButtons.map((btn, index) =>
                btn.divider ? (
                  <div key={index} className="w-px h-6 bg-gold/10 mx-1" />
                ) : (
                  <button
                    key={index}
                    title={btn.label}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <btn.icon size={16} />
                  </button>
                )
              )}
            </div>

            {/* Editor */}
            <div className="p-6">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="ابدأ بكتابة محتوى المقال هنا..."
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
              الصورة الرئيسية
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
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-gold/20 rounded-xl cursor-pointer hover:border-gold/40 transition-colors">
                <Upload className="text-gold/50 mb-2" size={32} />
                <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
                  اضغط لرفع صورة
                </span>
                <span className="text-white/30 text-xs mt-1">
                  PNG, JPG أو WebP
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
              القسم
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            >
              <option value="" className="bg-midnight">اختر القسم</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-midnight">
                  {cat}
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
              <Tag size={14} />
              الوسوم
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-gold text-obsidian'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-gold/10'
                  }`}
                >
                  {tag}
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
              <Calendar size={14} />
              جدولة النشر
            </label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            />
            <p className="text-white/40 text-xs mt-2 font-[family-name:var(--font-display)]">
              اتركه فارغاً للنشر الفوري
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
              الحالة
            </label>
            <div className="space-y-2">
              {[
                { value: 'draft', label: 'مسودة', icon: FileText, color: 'text-white/60' },
                { value: 'review', label: 'قيد المراجعة', icon: Clock, color: 'text-gold' },
                { value: 'published', label: 'منشور', icon: Send, color: 'text-profit' },
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
                    {opt.label}
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
