'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { createMagazine, updateMagazine } from '@/lib/api-client';
import { uploadFile } from '@/lib/supabase/storage';
import { convertPdfToImages } from '@/lib/magazine/pdf-to-images';

const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

type ConversionStep = 'idle' | 'creating' | 'uploading-pdf' | 'converting' | 'done' | 'error';

export default function NewMagazinePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const months = monthKeys.map(k => t(`admin.magazines.form.months.${k}`));

  const [issueNumber, setIssueNumber] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(months[new Date().getMonth()]);
  const [pages, setPages] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [status, setStatus] = useState('draft');
  const [featured, setFeatured] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [highlights, setHighlights] = useState<string[]>(['']);

  // PDF: stored locally until save — not uploaded pre-emptively
  const [pdfFileObj, setPdfFileObj] = useState<File | null>(null);

  // Multi-step conversion state
  const [conversionStep, setConversionStep] = useState<ConversionStep>('idle');
  const [conversionProgress, setConversionProgress] = useState({ current: 0, total: 0 });
  const [conversionError, setConversionError] = useState<string | null>(null);

  const isBusy = conversionStep !== 'idle' && conversionStep !== 'done' && conversionStep !== 'error';

  const addHighlight = () => setHighlights([...highlights, '']);
  const removeHighlight = (index: number) => setHighlights(highlights.filter((_, i) => i !== index));
  const updateHighlight = (index: number, value: string) => {
    const next = [...highlights];
    next[index] = value;
    setHighlights(next);
  };

  const handleSave = async (saveStatus?: string) => {
    if (!issueNumber.trim()) {
      toast.error(t('admin.magazines.create.enterIssueNumber'));
      return;
    }

    setConversionError(null);

    try {
      // ── Step 1: Create magazine record (get the ID) ──────────────────────────
      setConversionStep('creating');
      const res = await createMagazine({
        title: `${t('admin.magazines.create.issueLabel')} ${issueNumber}`,
        titleEn: `Issue ${issueNumber}`,
        issueNumber: Number(issueNumber),
        coverImage: coverImage || '',
        pdfUrl: '',
        publishDate: publishDate || undefined,
        status: saveStatus || status,
        featured,
        pages: pages ? Number(pages) : undefined,
        highlights: highlights.filter(h => h.trim()),
      });

      const issueId = res.data?.id;
      if (!issueId) throw new Error(t('admin.magazines.create.noIssueId'));

      // ── Step 2: Upload original PDF (for download button) ───────────────────
      let pdfUrl = '';
      if (pdfFileObj) {
        setConversionStep('uploading-pdf');
        const { publicUrl } = await uploadFile('magazines', pdfFileObj, 'pdfs');
        pdfUrl = publicUrl;

        // ── Step 3: Convert pages to WebP images ──────────────────────────────
        setConversionStep('converting');
        setConversionProgress({ current: 0, total: 0 });

        const pageUrls = await convertPdfToImages(
          pdfFileObj,
          issueId,
          (current, total) => setConversionProgress({ current, total })
        );

        // ── Step 4: Update magazine with PDF URL + page images ────────────────
        await updateMagazine(issueId, {
          pdfUrl,
          pagesImages: pageUrls,
          pagesReady: true,
          pages: pageUrls.length,
        });
      }

      setConversionStep('done');
      toast.success(t('admin.magazines.create.savedSuccess'));
      router.push(`/admin/magazines/${issueId}`);
    } catch (err: any) {
      setConversionStep('error');
      setConversionError(err.message || t('admin.magazines.create.saveError'));
      toast.error(err.message || t('admin.magazines.create.saveError'));
    }
  };

  const stepLabel: Record<ConversionStep, string> = {
    idle: '',
    creating: t('admin.magazines.conversion.saving'),
    'uploading-pdf': t('admin.magazines.conversion.uploadingPdf'),
    converting: conversionProgress.total > 0
      ? t('admin.magazines.conversion.convertingProgress').replace('{current}', String(conversionProgress.current)).replace('{total}', String(conversionProgress.total))
      : t('admin.magazines.conversion.initializing'),
    done: t('admin.magazines.conversion.done'),
    error: t('admin.magazines.conversion.error'),
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
              {t('admin.magazines.create.title')}
            </h1>
            <p className="text-white/50 text-sm">
              {t('admin.magazines.create.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <Eye size={18} />
            {t('admin.magazines.create.preview')}
          </button>
          <button
            onClick={() => handleSave()}
            disabled={isBusy}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-ink font-[family-name:var(--font-display)] font-bold rounded-xl hover:shadow-gold transition-all disabled:opacity-70"
          >
            {isBusy ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {t('admin.magazines.create.saveIssue')}
          </button>
        </div>
      </div>

      {/* Conversion progress bar */}
      {(isBusy || conversionStep === 'error') && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 border ${
            conversionStep === 'error'
              ? 'bg-loss/10 border-loss/30'
              : 'bg-gold/10 border-gold/30'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            {conversionStep === 'error' ? (
              <AlertCircle size={18} className="text-loss shrink-0" />
            ) : (
              <Loader2 size={18} className="text-gold animate-spin shrink-0" />
            )}
            <span className="text-white font-[family-name:var(--font-display)] font-semibold">
              {stepLabel[conversionStep]}
            </span>
          </div>
          {conversionStep === 'converting' && conversionProgress.total > 0 && (
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gold rounded-full"
                animate={{ width: `${(conversionProgress.current / conversionProgress.total) * 100}%` }}
                transition={{ ease: 'linear', duration: 0.3 }}
              />
            </div>
          )}
          {conversionError && (
            <p className="text-loss/80 text-sm mt-2 font-[family-name:var(--font-display)]">
              {conversionError}
            </p>
          )}
        </motion.div>
      )}

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

              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.magazines.form.pageCount')}
                </label>
                <input
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder={t('admin.magazines.form.pageCountPlaceholder')}
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
                {isUploadingCover ? (
                  <Loader2 size={32} className="text-gold animate-spin mb-3" />
                ) : (
                  <Upload size={32} className="text-gold/50 mb-3" />
                )}
                <span className="text-white/60 font-[family-name:var(--font-display)]">
                  {isUploadingCover ? t('admin.magazines.form.uploading') : t('admin.magazines.form.clickToUploadCover')}
                </span>
                <span className="text-white/40 text-sm mt-1">
                  {t('admin.magazines.form.coverRecommendedSize')}
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
            )}
          </motion.div>

          {/* PDF File — local selection only, conversion happens on save */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-2 flex items-center gap-2">
              <FileText size={20} className="text-gold" />
              {t('admin.magazines.form.pdfFile')}
            </h2>
            <p className="text-white/40 text-sm font-[family-name:var(--font-display)] mb-6">
              {t('admin.magazines.form.pdfAutoConvert')}
            </p>

            {pdfFileObj ? (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-10 h-10 bg-gold/20 rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-[family-name:var(--font-display)] font-semibold truncate">
                    {pdfFileObj.name}
                  </p>
                  <p className="text-white/50 text-sm">
                    {(pdfFileObj.size / (1024 * 1024)).toFixed(1)} MB — {t('admin.magazines.form.willConvertOnSave')}
                  </p>
                </div>
                <button
                  onClick={() => setPdfFileObj(null)}
                  className="p-2 text-loss hover:bg-loss/10 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gold/20 rounded-xl cursor-pointer hover:border-gold/40 transition-colors bg-white/5">
                <Upload size={24} className="text-gold/50 mb-2" />
                <span className="text-white/60 font-[family-name:var(--font-display)]">
                  {t('admin.magazines.form.clickToSelectPdf')}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPdfFileObj(file);
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
                className={`w-12 h-7 rounded-full transition-all ${featured ? 'bg-gold' : 'bg-white/20'}`}
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
              {t('admin.magazines.create.preview')}
            </h2>

            <div className="bg-gradient-to-br from-navy to-navy-light rounded-xl p-4">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-obsidian/50 mb-4">
                {coverImage ? (
                  <img src={coverImage} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={48} className="text-white/20" />
                  </div>
                )}
                {featured && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-gold text-ink text-xs font-bold rounded">
                    {t('admin.magazines.create.featured')}
                  </div>
                )}
              </div>
              <h3 className="font-[family-name:var(--font-display)] font-bold text-white">
                {t('admin.magazines.create.issueLabel')} {issueNumber || '---'}
              </h3>
              <p className="text-gold text-sm">{month} {year}</p>
              {pdfFileObj && (
                <div className="mt-2 flex items-center gap-1.5 text-white/50 text-xs">
                  <CheckCircle2 size={12} className="text-profit" />
                  <span>{t('admin.magazines.form.pdfReadyForConversion')}</span>
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
              {t('admin.magazines.create.quickActions')}
            </h2>

            <div className="space-y-2">
              <button
                onClick={() => handleSave('draft')}
                disabled={isBusy}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gold/10 text-gold hover:bg-gold/20 rounded-xl transition-colors disabled:opacity-50"
              >
                {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span className="font-[family-name:var(--font-display)]">{t('admin.magazines.create.saveAsDraft')}</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
