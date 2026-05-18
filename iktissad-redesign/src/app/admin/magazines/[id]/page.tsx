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
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Images,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ApiResponse, MagazineIssue } from '@/types';
import { swrFetcher, updateMagazine, deleteMagazine } from '@/lib/api-client';
import { uploadFile } from '@/lib/supabase/storage';
import { convertPdfToImages } from '@/lib/magazine/pdf-to-images';

type ConversionStep = 'idle' | 'uploading-pdf' | 'converting' | 'done' | 'error';

const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

export default function EditMagazinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();

  const months = monthKeys.map(k => t(`admin.magazines.form.months.${k}`));

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

  // PDF conversion states
  const [newPdfFileObj, setNewPdfFileObj] = useState<File | null>(null);
  const [conversionStep, setConversionStep] = useState<ConversionStep>('idle');
  const [conversionProgress, setConversionProgress] = useState({ current: 0, total: 0 });
  const [conversionError, setConversionError] = useState<string | null>(null);
  const isConverting = conversionStep === 'uploading-pdf' || conversionStep === 'converting';

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
  }, [magazine, initialized, months]);

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
        title: `${t('admin.magazines.create.issueLabel')} ${issueNumber}`,
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
      toast.success(t('admin.magazines.edit.savedSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('admin.magazines.edit.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMagazine(id);
      toast.success(t('admin.magazines.edit.deletedSuccess'));
      router.push('/admin/magazines');
    } catch (err: any) {
      toast.error(err.message || t('admin.magazines.edit.deleteError'));
      setShowDeleteModal(false);
    }
  };

  const handleConvert = async () => {
    const source = newPdfFileObj ?? pdfFile;
    if (!source) {
      toast.error(t('admin.magazines.edit.noPdfToConvert'));
      return;
    }

    setConversionError(null);
    setConversionProgress({ current: 0, total: 0 });

    try {
      let pdfUrl = pdfFile;

      // If admin selected a new PDF file, upload it first
      if (newPdfFileObj) {
        setConversionStep('uploading-pdf');
        const { publicUrl } = await uploadFile('magazines', newPdfFileObj, 'pdfs');
        pdfUrl = publicUrl;
        setPdfFile(publicUrl);
      }

      setConversionStep('converting');
      const pageUrls = await convertPdfToImages(
        source,
        id,
        (current, total) => setConversionProgress({ current, total })
      );

      await updateMagazine(id, {
        pdfUrl: pdfUrl || '',
        pagesImages: pageUrls,
        pagesReady: true,
        pages: pageUrls.length,
      });

      setPages(String(pageUrls.length));
      setNewPdfFileObj(null);
      setConversionStep('done');
      toast.success(t('admin.magazines.edit.convertedSuccess').replace('{count}', String(pageUrls.length)));
    } catch (err: any) {
      setConversionStep('error');
      setConversionError(err.message || t('admin.magazines.edit.convertError'));
      toast.error(err.message || t('admin.magazines.edit.convertError'));
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
          {t('admin.magazines.notFound')}
        </h2>
        <p className="text-white/50 mb-4">{t('admin.magazines.notFoundDesc')}</p>
        <Link href="/admin/magazines" className="text-gold hover:underline">
          {t('admin.magazines.backToList')}
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
              {t('admin.magazines.edit.title')} {issueNumber}
            </h1>
            <p className="text-white/50 text-sm">
              {magazine?.updatedAt
                ? `${t('admin.magazines.edit.lastUpdate')} ${new Date(magazine.updatedAt).toLocaleDateString('ar-SA-u-ca-gregory')}`
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
            {t('admin.magazines.edit.viewOnSite')}
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-loss hover:bg-loss/10 rounded-xl transition-colors"
          >
            <Trash2 size={18} />
            {t('admin.magazines.actions.delete')}
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
            {t('admin.magazines.edit.saveChanges')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gold/10 overflow-x-auto">
        {[
          { href: `/admin/magazines/${id}`, label: t('admin.magazines.tabs.overview') },
          { href: `/admin/magazines/${id}/board`, label: t('admin.magazines.tabs.editBoard') },
          { href: `/admin/magazines/${id}/sections`, label: t('admin.magazines.tabs.sections') },
          { href: `/admin/magazines/${id}/spreads`, label: t('admin.magazines.tabs.content') },
          { href: `/admin/magazines/${id}/analytics`, label: t('admin.magazines.tabs.analytics') },
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
          { label: t('admin.magazines.edit.views'), value: (magazine?.views ?? 0).toLocaleString(), icon: Eye, trend: null },
          { label: t('admin.magazines.edit.downloads'), value: (magazine?.downloads ?? 0).toLocaleString(), icon: Download, trend: null },
          { label: t('admin.magazines.edit.pages'), value: magazine?.pages ?? 0, icon: FileText, trend: null },
          { label: t('admin.magazines.edit.statusLabel'), value: status === 'published' ? t('admin.magazines.form.statusPublished') : t('admin.magazines.form.statusDraft'), icon: BookOpen, trend: null },
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
              {t('admin.magazines.form.issueInfo')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Issue Number */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.magazines.form.issueNumber')}
                </label>
                <input
                  type="text"
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  placeholder={t('admin.magazines.form.issueNumberPlaceholder')}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.magazines.form.year')}
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
                >
                  {Array.from({ length: new Date().getFullYear() - 1955 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.magazines.form.month')}
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
                  {t('admin.magazines.form.pageCount')}
                </label>
                <input
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder={t('admin.magazines.form.pageCountEditPlaceholder')}
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
              {t('admin.magazines.form.coverImage')}
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
                  {isUploadingCover ? t('admin.magazines.form.uploading') : coverImage ? t('admin.magazines.form.replaceCover') : t('admin.magazines.form.uploadCover')}
                </span>
                <span className="text-white/40 text-sm mt-1">
                  {t('admin.magazines.form.coverFormats')}
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
                      toast.success(t('admin.magazines.form.coverUploaded'));
                    } catch (err: any) {
                      toast.error(err.message || t('admin.magazines.form.coverUploadFailed'));
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
              {t('admin.magazines.form.pdfFile')}
            </h2>

            {pdfFile ? (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <FileText size={32} className="text-gold" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-[family-name:var(--font-display)] font-semibold truncate">
                    {pdfFile.split('/').pop() ?? t('admin.magazines.edit.pdfLabel')}
                  </p>
                  <p className="text-white/50 text-sm">{t('admin.magazines.form.pdfReady')}</p>
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
                  {isUploadingPdf ? t('admin.magazines.form.uploading') : t('admin.magazines.form.clickToUploadPdf')}
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
                      toast.success(t('admin.magazines.form.pdfUploaded'));
                    } catch (err: any) {
                      toast.error(err.message || t('admin.magazines.form.pdfUploadFailed'));
                    } finally {
                      setIsUploadingPdf(false);
                    }
                  }}
                />
              </label>
            )}
          </motion.div>

          {/* Pages / Conversion Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white flex items-center gap-2">
                <Images size={20} className="text-gold" />
                {t('admin.magazines.edit.magazinePages')}
              </h2>
              {/* Status badge */}
              {magazine?.pagesReady ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-profit/15 text-profit text-xs font-semibold rounded-full">
                  <CheckCircle2 size={12} />
                  {t('admin.magazines.edit.pagesReady').replace('{count}', String(magazine.pagesImages?.length ?? 0))}
                </span>
              ) : (
                <span className="px-3 py-1 bg-white/10 text-white/50 text-xs rounded-full">
                  {t('admin.magazines.edit.notConverted')}
                </span>
              )}
            </div>

            {/* Thumbnail strip for already-converted issues */}
            {magazine?.pagesReady && (magazine.pagesImages?.length ?? 0) > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
                {(magazine.pagesImages ?? []).slice(0, 8).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`${t('admin.magazines.edit.pageAlt')} ${i + 1}`}
                    className="h-24 w-auto rounded-lg shrink-0 object-cover border border-gold/10"
                  />
                ))}
                {(magazine.pagesImages ?? []).length > 8 && (
                  <div className="h-24 w-16 rounded-lg shrink-0 bg-white/5 border border-gold/10 flex items-center justify-center text-white/40 text-xs font-[family-name:var(--font-display)]">
                    +{(magazine.pagesImages ?? []).length - 8}
                  </div>
                )}
              </div>
            )}

            {/* Conversion progress */}
            {isConverting && (
              <div className="mb-4 p-4 bg-gold/10 border border-gold/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 size={16} className="text-gold animate-spin" />
                  <span className="text-white text-sm font-[family-name:var(--font-display)]">
                    {conversionStep === 'uploading-pdf'
                      ? t('admin.magazines.edit.uploadingPdf')
                      : conversionProgress.total > 0
                        ? t('admin.magazines.edit.convertingProgress').replace('{current}', String(conversionProgress.current)).replace('{total}', String(conversionProgress.total))
                        : t('admin.magazines.edit.initializing')}
                  </span>
                </div>
                {conversionStep === 'converting' && conversionProgress.total > 0 && (
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gold rounded-full"
                      animate={{ width: `${(conversionProgress.current / conversionProgress.total) * 100}%` }}
                      transition={{ ease: 'linear', duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            )}

            {conversionStep === 'error' && conversionError && (
              <div className="mb-4 p-3 bg-loss/10 border border-loss/20 rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="text-loss mt-0.5 shrink-0" />
                <p className="text-loss/80 text-sm font-[family-name:var(--font-display)]">{conversionError}</p>
              </div>
            )}

            {/* Upload new PDF + convert */}
            <div className="space-y-3">
              {newPdfFileObj ? (
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <FileText size={18} className="text-gold shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-[family-name:var(--font-display)] truncate">{newPdfFileObj.name}</p>
                    <p className="text-white/40 text-xs">{(newPdfFileObj.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                  <button
                    onClick={() => setNewPdfFileObj(null)}
                    className="p-1.5 text-white/40 hover:text-loss transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gold/20 rounded-xl cursor-pointer hover:border-gold/40 transition-colors text-white/50 hover:text-white/70">
                  <Upload size={16} />
                  <span className="text-sm font-[family-name:var(--font-display)]">{t('admin.magazines.edit.uploadNewPdf')}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewPdfFileObj(file);
                        setConversionStep('idle');
                      }
                    }}
                  />
                </label>
              )}

              <button
                onClick={handleConvert}
                disabled={isConverting || (!newPdfFileObj && !pdfFile)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gold/10 text-gold hover:bg-gold/20 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-display)] font-semibold"
              >
                {isConverting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                {newPdfFileObj ? t('admin.magazines.edit.uploadAndConvert') : t('admin.magazines.edit.reconvertPages')}
              </button>
            </div>
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
                {t('admin.magazines.form.highlights')}
              </h2>
              <button
                onClick={addHighlight}
                className="flex items-center gap-2 px-3 py-1.5 text-gold hover:bg-gold/10 rounded-lg transition-colors text-sm"
              >
                <Plus size={16} />
                {t('admin.magazines.form.addHighlight')}
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
                    placeholder={t('admin.magazines.form.highlightPlaceholder')}
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
              {t('admin.magazines.form.publishSettings')}
            </h2>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                {t('admin.magazines.form.status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
              >
                <option value="draft">{t('admin.magazines.form.statusDraft')}</option>
                <option value="scheduled">{t('admin.magazines.form.statusScheduled')}</option>
                <option value="published">{t('admin.magazines.form.statusPublished')}</option>
              </select>
            </div>

            {/* Publish Date */}
            <div className="mb-4">
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                {t('admin.magazines.form.publishDate')}
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
                    {t('admin.magazines.form.featuredIssue')}
                  </p>
                  <p className="text-white/50 text-xs">
                    {t('admin.magazines.form.featuredDesc')}
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
              {t('admin.magazines.edit.activityLog')}
            </h2>

            <div className="space-y-4">
              {magazine?.updatedAt && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-gold/50" />
                  <div>
                    <p className="text-white/80">{t('admin.magazines.edit.issueUpdated')}</p>
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
                    <p className="text-white/80">{t('admin.magazines.edit.issueCreated')}</p>
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
              {t('admin.magazines.edit.quickActions')}
            </h2>

            <div className="space-y-2">
              <Link
                href={`/magazine/${id}/browse`}
                target="_blank"
                className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                <Eye size={18} />
                <span className="font-[family-name:var(--font-display)]">{t('admin.magazines.edit.previewOnSite')}</span>
              </Link>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <BarChart3 size={18} />
                <span className="font-[family-name:var(--font-display)]">{t('admin.magazines.actions.viewStats')}</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gold/10 text-gold hover:bg-gold/20 rounded-xl transition-colors"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span className="font-[family-name:var(--font-display)]">{t('admin.magazines.edit.saveChanges')}</span>
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
                  {t('admin.magazines.edit.deleteIssueTitle').replace('{number}', issueNumber)}
                </h3>
                <p className="text-white/60 mb-6">
                  {t('admin.magazines.edit.deleteIssueConfirm')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-3 bg-white/10 text-white font-[family-name:var(--font-display)] font-semibold rounded-xl hover:bg-white/20 transition-colors"
                  >
                    {t('admin.magazines.edit.cancel')}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-3 bg-loss text-white font-[family-name:var(--font-display)] font-semibold rounded-xl hover:bg-loss/80 transition-colors"
                  >
                    {t('admin.magazines.actions.delete')}
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
