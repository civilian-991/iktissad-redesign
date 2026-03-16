'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useSWR from 'swr';
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
  Loader2,
  BarChart3,
  Download,
  History,
  ExternalLink
} from 'lucide-react';
import type { ApiResponse, MagazineIssue } from '@/types';
import { swrFetcher, updateMagazine, deleteMagazine } from '@/lib/api-client';
import { uploadFile } from '@/lib/supabase/storage';

const months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export default function EditMagazinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading } = useSWR<ApiResponse<MagazineIssue>>(
    `/api/magazines/${id}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const magazine = data?.data;

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
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Populate form fields when data loads
  useEffect(() => {
    if (magazine && !initialized) {
      setIssueNumber(String(magazine.issueNumber ?? ''));
      if (magazine.publishDate) {
        const d = new Date(magazine.publishDate);
        setYear(d.getFullYear());
        setMonth(months[d.getMonth()] || months[0]);
        setPublishDate(magazine.publishDate.split('T')[0] || '');
      }
      setPages(String(magazine.pages ?? ''));
      setStatus(magazine.status || 'draft');
      setFeatured(magazine.featured ?? false);
      setCoverImage(magazine.coverImage || null);
      setPdfFile(magazine.pdfUrl || null);
      setHighlights(magazine.highlights?.length ? magazine.highlights : ['']);
      setInitialized(true);
    }
  }, [magazine, initialized]);

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
    try {
      await updateMagazine(id, {
        title: `العدد ${issueNumber}`,
        titleEn: `Issue ${issueNumber}`,
        issueNumber: Number(issueNumber),
        coverImage: coverImage || '',
        pdfUrl: pdfFile || '',
        publishDate: publishDate || undefined,
        status,
        featured,
        pages: pages ? Number(pages) : undefined,
        highlights: highlights.filter(h => h.trim()),
      });
      toast.success('تم حفظ التغييرات بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMagazine(id);
      toast.success('تم حذف العدد بنجاح');
      router.push('/admin/magazines');
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحذف');
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  if (!magazine && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <BookOpen size={48} className="text-white/20 mb-4" />
        <h2 className="text-xl font-[family-name:var(--font-display)] font-bold text-white mb-2">
          العدد غير موجود
        </h2>
        <p className="text-white/50 mb-4">لم يتم العثور على العدد المطلوب</p>
        <Link href="/admin/magazines" className="text-gold hover:underline">
          العودة إلى قائمة الأعداد
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
            href="/admin/magazines"
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
              تعديل العدد {issueNumber}
            </h1>
            <p className="text-white/50 text-sm">
              {magazine?.updatedAt
                ? `آخر تحديث: ${new Date(magazine.updatedAt).toLocaleDateString('ar-SA-u-ca-gregory')}`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/magazine/${id}/browse`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <ExternalLink size={18} />
            عرض على الموقع
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-loss hover:bg-loss/10 rounded-xl transition-colors"
          >
            <Trash2 size={18} />
            حذف
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
            حفظ التغييرات
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gold/10 overflow-x-auto">
        {[
          { href: `/admin/magazines/${id}`, label: 'نظرة عامة' },
          { href: `/admin/magazines/${id}/board`, label: 'لوحة التحرير' },
          { href: `/admin/magazines/${id}/sections`, label: 'الأقسام' },
          { href: `/admin/magazines/${id}/spreads`, label: 'المحتوى' },
          { href: `/admin/magazines/${id}/analytics`, label: 'التحليلات' },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-[family-name:var(--font-display)] whitespace-nowrap border-b-2 transition-colors ${
              tab.href === `/admin/magazines/${id}`
                ? 'border-gold text-gold'
                : 'border-transparent text-white/50 hover:text-white hover:border-white/20'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'المشاهدات', value: (magazine?.views ?? 0).toLocaleString(), icon: Eye, trend: null },
          { label: 'التحميلات', value: (magazine?.downloads ?? 0).toLocaleString(), icon: Download, trend: null },
          { label: 'الصفحات', value: magazine?.pages ?? 0, icon: FileText, trend: null },
          { label: 'الحالة', value: status === 'published' ? 'منشور' : 'مسودة', icon: BookOpen, trend: null },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon size={20} className="text-gold" />
              {stat.trend && (
                <span className="text-profit text-xs font-semibold">{stat.trend}</span>
              )}
            </div>
            <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
              {stat.value}
            </p>
            <p className="text-white/50 text-sm">{stat.label}</p>
          </motion.div>
        ))}
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

            <div className="flex items-start gap-6">
              {coverImage && (
                <div className="relative">
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
              )}

              <label className="flex-1 flex flex-col items-center justify-center h-64 border-2 border-dashed border-gold/20 rounded-xl cursor-pointer hover:border-gold/40 transition-colors bg-white/5">
                {isUploadingCover ? (
                  <Loader2 size={32} className="text-gold animate-spin mb-3" />
                ) : (
                  <Upload size={32} className="text-gold/50 mb-3" />
                )}
                <span className="text-white/60 font-[family-name:var(--font-display)]">
                  {isUploadingCover ? 'جاري الرفع...' : coverImage ? 'استبدال الصورة' : 'رفع صورة الغلاف'}
                </span>
                <span className="text-white/40 text-sm mt-1">
                  PNG, JPG أو WebP
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploadingCover(true);
                    try {
                      const { publicUrl } = await uploadFile('magazines', file, 'covers');
                      setCoverImage(publicUrl);
                      toast.success('تم رفع صورة الغلاف');
                    } catch (err: any) {
                      toast.error(err.message || 'فشل رفع الصورة');
                    } finally {
                      setIsUploadingCover(false);
                    }
                  }}
                />
              </label>
            </div>
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
                <div className="flex-1 min-w-0">
                  <p className="text-white font-[family-name:var(--font-display)] font-semibold truncate">
                    {pdfFile.split('/').pop() ?? 'ملف PDF'}
                  </p>
                  <p className="text-white/50 text-sm">ملف PDF جاهز للقراءة</p>
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
                {isUploadingPdf ? (
                  <Loader2 size={24} className="text-gold animate-spin mb-2" />
                ) : (
                  <Upload size={24} className="text-gold/50 mb-2" />
                )}
                <span className="text-white/60 font-[family-name:var(--font-display)]">
                  {isUploadingPdf ? 'جاري الرفع...' : 'اضغط لرفع ملف PDF'}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploadingPdf(true);
                    try {
                      const { publicUrl } = await uploadFile('magazines', file, 'pdfs');
                      setPdfFile(publicUrl);
                      toast.success('تم رفع ملف PDF');
                    } catch (err: any) {
                      toast.error(err.message || 'فشل رفع الملف');
                    } finally {
                      setIsUploadingPdf(false);
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

          {/* Activity Log */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-4 flex items-center gap-2">
              <History size={18} className="text-gold" />
              سجل النشاط
            </h2>

            <div className="space-y-4">
              {magazine?.updatedAt && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-gold/50" />
                  <div>
                    <p className="text-white/80">تم تحديث العدد</p>
                    <p className="text-white/40 text-xs">
                      {new Date(magazine.updatedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                    </p>
                  </div>
                </div>
              )}
              {magazine?.createdAt && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-gold/50" />
                  <div>
                    <p className="text-white/80">تم إنشاء العدد</p>
                    <p className="text-white/40 text-xs">
                      {new Date(magazine.createdAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                    </p>
                  </div>
                </div>
              )}
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
              <Link
                href={`/magazine/${id}/browse`}
                target="_blank"
                className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                <Eye size={18} />
                <span className="font-[family-name:var(--font-display)]">معاينة على الموقع</span>
              </Link>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <BarChart3 size={18} />
                <span className="font-[family-name:var(--font-display)]">عرض الإحصائيات</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gold/10 text-gold hover:bg-gold/20 rounded-xl transition-colors"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span className="font-[family-name:var(--font-display)]">حفظ التغييرات</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-midnight border border-gold/20 rounded-2xl p-6 z-50"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-loss/20 rounded-full flex items-center justify-center">
                  <Trash2 size={32} className="text-loss" />
                </div>
                <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-white mb-2">
                  حذف العدد {issueNumber}؟
                </h3>
                <p className="text-white/60 mb-6">
                  هل أنت متأكد من حذف هذا العدد؟ سيتم حذف جميع البيانات المرتبطة به ولا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-3 bg-white/10 text-white font-[family-name:var(--font-display)] font-semibold rounded-xl hover:bg-white/20 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-3 bg-loss text-white font-[family-name:var(--font-display)] font-semibold rounded-xl hover:bg-loss/80 transition-colors"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
