'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  ArrowRight,
  Save,
  Eye,
  Upload,
  X,
  Calendar,
  FileText,
  BookOpen,
  Star,
  Plus,
  Trash2,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

const months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export default function NewMagazinePage() {
  const [issueNumber, setIssueNumber] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(months[new Date().getMonth()]);
  const [pages, setPages] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [status, setStatus] = useState('draft');
  const [featured, setFeatured] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<string[]>(['']);
  const [isSaving, setIsSaving] = useState(false);

  const addHighlight = () => {
    setHighlights([...highlights, '']);
  };

  const removeHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...highlights];
    newHighlights[index] = value;
    setHighlights(newHighlights);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/magazines"
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
              عدد جديد
            </h1>
            <p className="text-white/50 text-sm">
              إضافة عدد جديد من المجلة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <Eye size={18} />
            معاينة
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-bold rounded-xl hover:shadow-gold transition-all disabled:opacity-70"
          >
            {isSaving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            حفظ العدد
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen size={20} className="text-gold" />
              معلومات العدد
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Issue Number */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  رقم العدد
                </label>
                <input
                  type="text"
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  placeholder="مثال: 543"
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  السنة
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
                >
                  {[2026, 2025, 2024, 2023].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  الشهر
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
                >
                  {months.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Pages */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  عدد الصفحات
                </label>
                <input
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder="مثال: 84"
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>
            </div>
          </motion.div>

          {/* Cover Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-6 flex items-center gap-2">
              <ImageIcon size={20} className="text-gold" />
              صورة الغلاف
            </h2>

            {coverImage ? (
              <div className="relative inline-block">
                <img
                  src={coverImage}
                  alt="Cover"
                  className="w-48 h-64 object-cover rounded-xl"
                />
                <button
                  onClick={() => setCoverImage(null)}
                  className="absolute -top-2 -right-2 p-1.5 bg-loss rounded-full text-white hover:bg-loss/80 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gold/20 rounded-xl cursor-pointer hover:border-gold/40 transition-colors bg-white/5">
                <Upload size={32} className="text-gold/50 mb-3" />
                <span className="text-white/60 font-[family-name:var(--font-display)]">
                  اضغط لرفع صورة الغلاف
                </span>
                <span className="text-white/40 text-sm mt-1">
                  PNG, JPG أو WebP (الحجم الموصى به: 400×560)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverImage(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            )}
          </motion.div>

          {/* PDF File */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-6 flex items-center gap-2">
              <FileText size={20} className="text-gold" />
              ملف PDF
            </h2>

            {pdfFile ? (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <FileText size={32} className="text-gold" />
                <div className="flex-1">
                  <p className="text-white font-[family-name:var(--font-display)] font-semibold">
                    {pdfFile}
                  </p>
                  <p className="text-white/50 text-sm">ملف PDF جاهز</p>
                </div>
                <button
                  onClick={() => setPdfFile(null)}
                  className="p-2 text-loss hover:bg-loss/10 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gold/20 rounded-xl cursor-pointer hover:border-gold/40 transition-colors bg-white/5">
                <Upload size={24} className="text-gold/50 mb-2" />
                <span className="text-white/60 font-[family-name:var(--font-display)]">
                  اضغط لرفع ملف PDF
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPdfFile(file.name);
                    }
                  }}
                />
              </label>
            )}
          </motion.div>

          {/* Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white flex items-center gap-2">
                <Star size={20} className="text-gold" />
                أبرز المواضيع
              </h2>
              <button
                onClick={addHighlight}
                className="flex items-center gap-2 px-3 py-1.5 text-gold hover:bg-gold/10 rounded-lg transition-colors text-sm"
              >
                <Plus size={16} />
                إضافة
              </button>
            </div>

            <div className="space-y-3">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gold/20 rounded-lg flex items-center justify-center text-gold font-bold text-sm">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) => updateHighlight(index, e.target.value)}
                    placeholder="عنوان الموضوع..."
                    className="flex-1 bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                  />
                  {highlights.length > 1 && (
                    <button
                      onClick={() => removeHighlight(index)}
                      className="p-2 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-6">
              إعدادات النشر
            </h2>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                الحالة
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
              >
                <option value="draft">مسودة</option>
                <option value="scheduled">مجدول</option>
                <option value="published">منشور</option>
              </select>
            </div>

            {/* Publish Date */}
            <div className="mb-4">
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                تاريخ النشر
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 pr-12 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
              </div>
            </div>

            {/* Featured Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <Star size={20} className={featured ? 'text-gold fill-gold' : 'text-white/40'} />
                <div>
                  <p className="text-white font-[family-name:var(--font-display)] font-semibold">
                    عدد مميز
                  </p>
                  <p className="text-white/50 text-xs">
                    يظهر في الصفحة الرئيسية
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFeatured(!featured)}
                className={`w-12 h-7 rounded-full transition-all ${
                  featured ? 'bg-gold' : 'bg-white/20'
                }`}
              >
                <motion.div
                  animate={{ x: featured ? 20 : 2 }}
                  className="w-5 h-5 bg-white rounded-full shadow-lg"
                />
              </button>
            </div>
          </motion.div>

          {/* Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-4">
              معاينة
            </h2>

            <div className="bg-gradient-to-br from-navy to-navy-light rounded-xl p-4">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-obsidian/50 mb-4">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={48} className="text-white/20" />
                  </div>
                )}
                {featured && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-gold text-obsidian text-xs font-bold rounded">
                    مميز
                  </div>
                )}
              </div>
              <h3 className="font-[family-name:var(--font-display)] font-bold text-white">
                العدد {issueNumber || '---'}
              </h3>
              <p className="text-gold text-sm">
                {month} {year}
              </p>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-4">
              إجراءات
            </h2>

            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <Eye size={18} />
                <span className="font-[family-name:var(--font-display)]">معاينة على الموقع</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gold/10 text-gold hover:bg-gold/20 rounded-xl transition-colors"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span className="font-[family-name:var(--font-display)]">حفظ كمسودة</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
