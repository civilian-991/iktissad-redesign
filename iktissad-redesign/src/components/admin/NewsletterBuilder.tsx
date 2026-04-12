/**
 * NewsletterBuilder — Phase 4.3
 *
 * 3-panel visual email builder:
 *   Left  — Block library (drag source or click-to-add)
 *   Center — Canvas (ordered block list with inline edit, move, delete)
 *   Right  — Settings (subject, segment, schedule, save/send)
 *
 * Uses @dnd-kit/core + @dnd-kit/sortable for block reordering.
 * Falls back gracefully to arrow buttons on touch devices.
 */

'use client';

import { useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import useSWR from 'swr';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Mail,
  LayoutTemplate,
  Send,
  Eye,
  Calendar,
  Users,
  Pencil,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  FileText,
  Quote,
  Image,
  Minus,
  MousePointerClick,
  GripVertical,
  X,
  Search,
  Loader2,
  ArrowRight,
  Save,
  Type,
  AlignLeft,
} from 'lucide-react';
import Link from 'next/link';
import { swrFetcher } from '@/lib/api-client';
import { iconSizes } from '@/lib/design-tokens';
import type { Newsletter, NewsletterBlock, NewsletterBlockType, Article, ApiResponse } from '@/types';
// crypto.randomUUID() is available in all modern browsers and Node 14.17+
const uuidv4 = () => crypto.randomUUID();

// ─── Block Library config ────────────────────────────────────────

interface BlockConfig {
  type: NewsletterBlockType;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultData: Record<string, unknown>;
}

const BLOCK_LIBRARY: BlockConfig[] = [
  {
    type: 'headline',
    label: 'عنوان رئيسي',
    description: 'عنوان كبير بارز',
    icon: <Type size={iconSizes.md} />,
    defaultData: { text: 'عنوان النشرة', level: 'h1' },
  },
  {
    type: 'text',
    label: 'نص حر',
    description: 'فقرة نصية',
    icon: <AlignLeft size={iconSizes.md} />,
    defaultData: { html: '<p>أكتب محتواك هنا...</p>' },
  },
  {
    type: 'article_card',
    label: 'بطاقة مقال',
    description: 'مقال من نظام المحتوى',
    icon: <FileText size={iconSizes.md} />,
    defaultData: { articleId: null, title: '', excerpt: '', image: '', url: '' },
  },
  {
    type: 'quote',
    label: 'اقتباس',
    description: 'نص مميز باقتباس',
    icon: <Quote size={iconSizes.md} />,
    defaultData: { text: 'اكتب اقتباسك هنا...', attribution: '' },
  },
  {
    type: 'cta',
    label: 'زر دعوة',
    description: 'زر للإجراء (CTA)',
    icon: <MousePointerClick size={iconSizes.md} />,
    defaultData: { label: 'اقرأ المزيد', url: '', align: 'center' },
  },
  {
    type: 'image',
    label: 'صورة',
    description: 'صورة مع تعليق اختياري',
    icon: <Image size={iconSizes.md} />,
    defaultData: { src: '', alt: '', caption: '' },
  },
  {
    type: 'divider',
    label: 'فاصل',
    description: 'خط فاصل أفقي',
    icon: <Minus size={iconSizes.md} />,
    defaultData: { style: 'line' },
  },
  {
    type: 'upgrade_cta',
    label: 'ترقية الاشتراك',
    description: 'دعوة للمشتركين المجانيين للترقية',
    icon: <MousePointerClick size={iconSizes.md} />,
    defaultData: {
      headline:    'احصل على وصول غير محدود',
      body:        'اشترك في النسخة المميزة للوصول إلى التحليلات العميقة والتقارير الحصرية.',
      buttonLabel: 'اشترك الآن',
      buttonUrl:   '/subscribe',
    },
  },
];

// ─── Block preview renderers ─────────────────────────────────────

function BlockPreview({ block }: { block: NewsletterBlock }) {
  const d = block.data;

  switch (block.type) {
    case 'headline':
      return (
        <p className="text-white font-[family-name:var(--font-display)] font-bold text-lg leading-snug truncate">
          {(d.text as string) || 'عنوان رئيسي'}
        </p>
      );
    case 'text':
      return (
        <p
          className="text-white/70 text-sm line-clamp-2 font-[family-name:var(--font-display)]"
          dangerouslySetInnerHTML={{ __html: (d.html as string) || '<p>نص الفقرة...</p>' }}
        />
      );
    case 'article_card':
      return (
        <div className="flex items-center gap-3">
          {(d.image as string) ? (
            <img src={d.image as string} alt="" className="w-14 h-10 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-14 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-white/30" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white text-sm font-[family-name:var(--font-display)] font-semibold truncate">
              {(d.title as string) || 'بطاقة مقال'}
            </p>
            <p className="text-white/50 text-xs truncate">{(d.excerpt as string) || 'اختر مقالاً من المحتوى'}</p>
          </div>
        </div>
      );
    case 'quote':
      return (
        <blockquote className="border-s-4 border-gold/60 ps-3">
          <p className="text-white/80 text-sm italic font-[family-name:var(--font-display)] line-clamp-2">
            {(d.text as string) || 'نص الاقتباس...'}
          </p>
          {(d.attribution as string) && (
            <cite className="text-white/40 text-xs not-italic mt-1 block">— {d.attribution as string}</cite>
          )}
        </blockquote>
      );
    case 'cta':
      return (
        <div className="flex justify-center">
          <span className="inline-block px-5 py-2 bg-gold text-obsidian text-sm font-bold rounded-lg font-[family-name:var(--font-display)]">
            {(d.label as string) || 'اضغط هنا'}
          </span>
        </div>
      );
    case 'image':
      return (d.src as string) ? (
        <div>
          <img src={d.src as string} alt={(d.alt as string) || ''} className="w-full h-24 object-cover rounded-lg" />
          {(d.caption as string) && (
            <p className="text-white/40 text-xs text-center mt-1">{d.caption as string}</p>
          )}
        </div>
      ) : (
        <div className="w-full h-16 bg-white/10 rounded-lg flex items-center justify-center">
          <Image size={20} className="text-white/30" />
        </div>
      );
    case 'divider':
      return <hr className="border-white/20" />;
    case 'upgrade_cta':
      return (
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-center space-y-1">
          <p className="text-gold font-[family-name:var(--font-display)] font-bold text-sm truncate">
            {(d.headline as string) || 'احصل على وصول غير محدود'}
          </p>
          <p className="text-white/50 text-xs truncate">
            {(d.body as string) || 'اشترك في النسخة المميزة'}
          </p>
          <span className="inline-block mt-1 px-3 py-1 bg-gold/80 text-obsidian text-xs font-bold rounded-sm">
            {(d.buttonLabel as string) || 'اشترك الآن'}
          </span>
        </div>
      );
    default:
      return null;
  }
}

// ─── Block editor forms ──────────────────────────────────────────

function BlockEditor({
  block,
  onChange,
  onClose,
}: {
  block: NewsletterBlock;
  onChange: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const d = block.data;

  const field = (
    key: string,
    label: string,
    type: 'text' | 'textarea' | 'url' = 'text',
    placeholder = ''
  ) => (
    <div>
      <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={(d[key] as string) ?? ''}
          onChange={(e) => onChange({ ...d, [key]: e.target.value })}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-3 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors resize-none"
        />
      ) : (
        <input
          type={type}
          value={(d[key] as string) ?? ''}
          onChange={(e) => onChange({ ...d, [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-3 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
        />
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden border-t border-gold/10 mt-3 pt-3 space-y-3"
    >
      {block.type === 'headline' && (
        <>
          {field('text', 'نص العنوان', 'text', 'عنوان النشرة البريدية...')}
          <div>
            <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">المستوى</label>
            <select
              value={(d.level as string) ?? 'h1'}
              onChange={(e) => onChange({ ...d, level: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-3 text-white text-sm font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
            >
              <option value="h1" className="bg-midnight">H1 — رئيسي</option>
              <option value="h2" className="bg-midnight">H2 — ثانوي</option>
              <option value="h3" className="bg-midnight">H3 — فرعي</option>
            </select>
          </div>
        </>
      )}

      {block.type === 'text' && (
        <div>
          <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">النص (HTML مسموح)</label>
          <textarea
            value={(d.html as string) ?? ''}
            onChange={(e) => onChange({ ...d, html: e.target.value })}
            placeholder="<p>محتوى الفقرة...</p>"
            rows={4}
            className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-3 text-white text-sm font-mono placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors resize-none"
          />
        </div>
      )}

      {block.type === 'quote' && (
        <>
          {field('text', 'نص الاقتباس', 'textarea', 'اكتب الاقتباس هنا...')}
          {field('attribution', 'المصدر (اختياري)', 'text', 'الاسم أو المصدر')}
        </>
      )}

      {block.type === 'cta' && (
        <>
          {field('label', 'نص الزر', 'text', 'اقرأ المزيد')}
          {field('url', 'الرابط', 'url', 'https://')}
          <div>
            <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">المحاذاة</label>
            <select
              value={(d.align as string) ?? 'center'}
              onChange={(e) => onChange({ ...d, align: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-3 text-white text-sm font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
            >
              <option value="right" className="bg-midnight">يمين</option>
              <option value="center" className="bg-midnight">وسط</option>
              <option value="left" className="bg-midnight">يسار</option>
            </select>
          </div>
        </>
      )}

      {block.type === 'image' && (
        <>
          {field('src', 'رابط الصورة', 'url', 'https://...')}
          {field('alt', 'النص البديل', 'text', 'وصف الصورة')}
          {field('caption', 'التعليق (اختياري)', 'text', 'تعليق الصورة')}
        </>
      )}

      {block.type === 'divider' && (
        <div>
          <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">النمط</label>
          <select
            value={(d.style as string) ?? 'line'}
            onChange={(e) => onChange({ ...d, style: e.target.value })}
            className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-3 text-white text-sm font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
          >
            <option value="line" className="bg-midnight">خط عادي</option>
            <option value="ornament" className="bg-midnight">زخرفي</option>
            <option value="space" className="bg-midnight">مسافة فارغة</option>
          </select>
        </div>
      )}

      {block.type === 'article_card' && (
        <p className="text-white/40 text-xs font-[family-name:var(--font-display)] text-center py-2">
          اضغط على أيقونة البحث لاختيار مقال
        </p>
      )}

      {block.type === 'upgrade_cta' && (
        <>
          {field('headline', 'العنوان الرئيسي', 'text', 'احصل على وصول غير محدود')}
          {field('body', 'نص الوصف', 'textarea', 'اشترك في النسخة المميزة…')}
          {field('buttonLabel', 'نص الزر', 'text', 'اشترك الآن')}
          {field('buttonUrl', 'رابط الزر', 'url', '/subscribe')}
        </>
      )}

      <button
        onClick={onClose}
        className="w-full text-center text-white/40 hover:text-white/60 text-xs font-[family-name:var(--font-display)] transition-colors"
      >
        إغلاق التحرير
      </button>
    </motion.div>
  );
}

// ─── Article picker modal ────────────────────────────────────────

function ArticlePickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (article: Article) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const swrKey = `/api/articles?status=published&pageSize=20${search ? `&search=${encodeURIComponent(search)}` : ''}`;
  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(swrKey, swrFetcher, {
    revalidateOnFocus: false,
  });
  const articles = data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-midnight border border-gold/20 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gold/10">
          <h3 className="text-white font-[family-name:var(--font-display)] font-bold text-lg">اختر مقالاً</h3>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={iconSizes.md} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gold/10">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث في المقالات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 ps-12 pe-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-gold/50" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12 text-white/40 font-[family-name:var(--font-display)]">
              لا توجد مقالات
            </div>
          ) : (
            articles.map((article) => (
              <button
                key={article.id}
                onClick={() => onSelect(article)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors text-start"
              >
                {article.featuredImage ? (
                  <img src={article.featuredImage} alt={article.title} className="w-16 h-12 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-16 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-white/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-white text-sm font-[family-name:var(--font-display)] font-semibold line-clamp-1">{article.title}</p>
                  <p className="text-white/50 text-xs line-clamp-1 mt-0.5">{article.excerpt}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Sortable block card ─────────────────────────────────────────

function SortableBlockCard({
  block,
  index,
  total,
  isEditing,
  onEdit,
  onMove,
  onDelete,
  onDataChange,
  onArticlePick,
}: {
  block: NewsletterBlock;
  index: number;
  total: number;
  isEditing: boolean;
  onEdit: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
  onDataChange: (data: Record<string, unknown>) => void;
  onArticlePick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const config = BLOCK_LIBRARY.find((b) => b.type === block.type);

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12, scale: 0.95 }}
        className={`bg-midnight/70 border rounded-xl p-4 transition-colors ${
          isEditing ? 'border-gold/40 shadow-lg shadow-gold/5' : 'border-gold/10 hover:border-gold/20'
        }`}
      >
        {/* Block header row */}
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 p-1 text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical size={iconSizes.md} />
          </button>

          {/* Block type icon + label */}
          <div className="flex items-center gap-2 text-white/40 flex-shrink-0">
            {config?.icon}
            <span className="text-xs font-[family-name:var(--font-display)] text-white/40 hidden sm:block">
              {config?.label}
            </span>
          </div>

          {/* Preview */}
          <div className="flex-1 min-w-0">
            <BlockPreview block={block} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {block.type === 'article_card' && (
              <button
                onClick={onArticlePick}
                title="اختر مقالاً"
                className="p-1.5 text-white/40 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
              >
                <Search size={iconSizes.sm} />
              </button>
            )}
            <button
              onClick={onEdit}
              title="تحرير"
              className={`p-1.5 rounded-lg transition-colors ${
                isEditing
                  ? 'text-gold bg-gold/10'
                  : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}
            >
              <Pencil size={iconSizes.sm} />
            </button>
            <button
              onClick={() => onMove('up')}
              disabled={index === 0}
              title="تحريك للأعلى"
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronUp size={iconSizes.sm} />
            </button>
            <button
              onClick={() => onMove('down')}
              disabled={index === total - 1}
              title="تحريك للأسفل"
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronDown size={iconSizes.sm} />
            </button>
            <button
              onClick={onDelete}
              title="حذف"
              className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <Trash2 size={iconSizes.sm} />
            </button>
          </div>
        </div>

        {/* Inline editor (animated expand) */}
        <AnimatePresence>
          {isEditing && (
            <BlockEditor
              block={block}
              onChange={onDataChange}
              onClose={onEdit}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Settings panel ──────────────────────────────────────────────

interface SettingsValues {
  title: string;
  subject: string;
  previewText: string;
  senderName: string;
  segment: 'all' | 'premium' | 'free';
  sendMode: 'now' | 'scheduled';
  scheduledAt: string;
}

function SettingsPanel({
  values,
  onChange,
  onSaveDraft,
  onSend,
  isSaving,
  isSending,
  status,
}: {
  values: SettingsValues;
  onChange: (v: Partial<SettingsValues>) => void;
  onSaveDraft: () => void;
  onSend: () => void;
  isSaving: boolean;
  isSending: boolean;
  status: Newsletter['status'] | 'new';
}) {
  const inputClass =
    'w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors';

  const labelClass = 'block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5';

  return (
    <div className="space-y-5">
      {/* Email metadata */}
      <div className="bg-midnight/50 border border-gold/10 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-[family-name:var(--font-display)] font-bold text-sm flex items-center gap-2">
          <Mail size={iconSizes.sm} className="text-gold" />
          إعدادات البريد
        </h3>

        <div>
          <label className={labelClass}>عنوان النشرة (داخلي)</label>
          <input
            type="text"
            value={values.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="اسم داخلي للنشرة..."
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>سطر الموضوع *</label>
          <input
            type="text"
            value={values.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            placeholder="موضوع البريد الإلكتروني..."
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>نص المعاينة</label>
          <input
            type="text"
            value={values.previewText}
            onChange={(e) => onChange({ previewText: e.target.value })}
            placeholder="يظهر في عميل البريد قبل الفتح..."
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>اسم المرسل</label>
          <input
            type="text"
            value={values.senderName}
            onChange={(e) => onChange({ senderName: e.target.value })}
            placeholder="إكتساد"
            className={inputClass}
          />
        </div>
      </div>

      {/* Audience */}
      <div className="bg-midnight/50 border border-gold/10 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-[family-name:var(--font-display)] font-bold text-sm flex items-center gap-2">
          <Users size={iconSizes.sm} className="text-gold" />
          الجمهور المستهدف
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'all', label: 'الكل' },
            { value: 'premium', label: 'المميزون' },
            { value: 'free', label: 'المجانيون' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ segment: opt.value as SettingsValues['segment'] })}
              className={`py-2.5 rounded-xl text-sm font-[family-name:var(--font-display)] transition-all ${
                values.segment === opt.value
                  ? 'bg-gold text-obsidian font-bold'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-midnight/50 border border-gold/10 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-[family-name:var(--font-display)] font-bold text-sm flex items-center gap-2">
          <Calendar size={iconSizes.sm} className="text-gold" />
          موعد الإرسال
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'now', label: 'إرسال فوراً' },
            { value: 'scheduled', label: 'جدولة' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ sendMode: opt.value as SettingsValues['sendMode'] })}
              className={`py-2.5 rounded-xl text-sm font-[family-name:var(--font-display)] transition-all ${
                values.sendMode === opt.value
                  ? 'bg-gold text-obsidian font-bold'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {values.sendMode === 'scheduled' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <label className={labelClass}>التاريخ والوقت</label>
              <input
                type="datetime-local"
                value={values.scheduledAt}
                onChange={(e) => onChange({ scheduledAt: e.target.value })}
                className={inputClass}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={onSaveDraft}
          disabled={isSaving || status === 'sent'}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-gold/10 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors font-[family-name:var(--font-display)] font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 size={iconSizes.sm} className="animate-spin" /> : <Save size={iconSizes.sm} />}
          حفظ مسودة
        </button>

        <button
          onClick={onSend}
          disabled={isSending || status === 'sent' || status === 'cancelled'}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-gold to-gold/80 text-obsidian rounded-xl transition-all hover:shadow-lg hover:shadow-gold/20 font-[family-name:var(--font-display)] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSending ? <Loader2 size={iconSizes.sm} className="animate-spin" /> : <Send size={iconSizes.sm} />}
          {status === 'sent' ? 'تم الإرسال' : 'إرسال'}
        </button>
      </div>
    </div>
  );
}

// ─── Main NewsletterBuilder ──────────────────────────────────────

interface NewsletterBuilderProps {
  /** When provided, we're editing an existing newsletter */
  newsletter?: Newsletter;
}

export default function NewsletterBuilder({ newsletter }: NewsletterBuilderProps) {
  const router = useRouter();
  const dndId = useId();

  // ── Local state ────────────────────────────────────────────────
  const [blocks, setBlocks] = useState<NewsletterBlock[]>(newsletter?.blocks ?? []);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [articlePickerBlockId, setArticlePickerBlockId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'canvas' | 'settings'>('canvas');

  const [settings, setSettings] = useState<SettingsValues>({
    title: newsletter?.title ?? '',
    subject: newsletter?.subject ?? '',
    previewText: newsletter?.previewText ?? '',
    senderName: newsletter?.senderName ?? 'إكتساد',
    segment: newsletter?.segment ?? 'all',
    sendMode: newsletter?.scheduledAt ? 'scheduled' : 'now',
    scheduledAt: newsletter?.scheduledAt
      ? newsletter.scheduledAt.slice(0, 16)
      : '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [newsletterId, setNewsletterId] = useState<string | null>(newsletter?.id ?? null);
  const [currentStatus, setCurrentStatus] = useState<Newsletter['status'] | 'new'>(
    newsletter?.status ?? 'new'
  );

  // ── DnD sensors ────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Block operations ───────────────────────────────────────────
  const addBlock = useCallback((config: BlockConfig) => {
    const newBlock: NewsletterBlock = {
      id: uuidv4(),
      type: config.type,
      data: { ...config.defaultData },
    };
    setBlocks((prev) => [...prev, newBlock]);
    setEditingBlockId(newBlock.id);
    // If article_card, immediately open picker
    if (config.type === 'article_card') {
      setArticlePickerBlockId(newBlock.id);
    }
    // Switch to canvas on mobile
    setActiveTab('canvas');
  }, []);

  const updateBlockData = useCallback((id: string, data: Record<string, unknown>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, data } : b))
    );
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setEditingBlockId((prev) => (prev === id ? null : prev));
  }, []);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      return arrayMove(prev, idx, newIdx);
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((prev) => {
        const oldIndex = prev.findIndex((b) => b.id === active.id);
        const newIndex = prev.findIndex((b) => b.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  // ── Article picker handler ─────────────────────────────────────
  const handleArticleSelect = useCallback(
    (article: Article) => {
      if (!articlePickerBlockId) return;
      updateBlockData(articlePickerBlockId, {
        articleId: article.id,
        title: article.title,
        excerpt: article.excerpt,
        image: article.featuredImage,
        url: `/${article.slug}`,
      });
      setArticlePickerBlockId(null);
    },
    [articlePickerBlockId, updateBlockData]
  );

  // ── Build payload ──────────────────────────────────────────────
  const buildPayload = () => ({
    title: settings.title || settings.subject || 'نشرة بريدية',
    subject: settings.subject,
    previewText: settings.previewText || null,
    senderName: settings.senderName || 'إكتساد',
    segment: settings.segment,
    blocks,
    scheduledAt:
      settings.sendMode === 'scheduled' && settings.scheduledAt
        ? new Date(settings.scheduledAt).toISOString()
        : null,
  });

  // ── Save draft ─────────────────────────────────────────────────
  const handleSaveDraft = useCallback(async () => {
    if (!settings.subject.trim()) {
      toast.error('يرجى إدخال سطر الموضوع');
      return;
    }
    setIsSaving(true);
    try {
      const payload = { ...buildPayload(), status: 'draft' };
      let res: Response;

      if (newsletterId) {
        res = await fetch(`/api/newsletters/${newsletterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/newsletters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل الحفظ');
      }

      const json = await res.json();
      const saved: Newsletter = json.data;
      setNewsletterId(saved.id);
      setCurrentStatus(saved.status);
      toast.success('تم حفظ المسودة');

      // Navigate to edit URL if this was a new newsletter
      if (!newsletter?.id) {
        router.replace(`/admin/newsletters/${saved.id}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setIsSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, blocks, newsletterId, newsletter?.id, router]);

  // ── Send ───────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!settings.subject.trim()) {
      toast.error('يرجى إدخال سطر الموضوع');
      return;
    }
    if (blocks.length === 0) {
      toast.error('أضف محتوى للنشرة قبل الإرسال');
      return;
    }

    setIsSending(true);
    try {
      // First save/update to persist latest blocks & settings
      const payload = {
        ...buildPayload(),
        status: settings.sendMode === 'scheduled' ? 'scheduled' : 'draft',
      };

      let savedId = newsletterId;

      if (savedId) {
        const updateRes = await fetch(`/api/newsletters/${savedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!updateRes.ok) {
          const err = await updateRes.json();
          throw new Error(err.error || 'فشل التحديث');
        }
      } else {
        const createRes = await fetch('/api/newsletters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || 'فشل الحفظ');
        }
        const createJson = await createRes.json();
        savedId = createJson.data.id;
        setNewsletterId(savedId);
      }

      // If scheduled, just save — don't mark as sent yet
      if (settings.sendMode === 'scheduled') {
        setCurrentStatus('scheduled');
        toast.success('تمت جدولة النشرة بنجاح');
        router.push('/admin/newsletters');
        return;
      }

      // Send immediately
      const sendRes = await fetch(`/api/newsletters/${savedId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!sendRes.ok) {
        const err = await sendRes.json();
        throw new Error(err.error || 'فشل الإرسال');
      }

      setCurrentStatus('sent');
      toast.success('تم إرسال النشرة بنجاح');
      router.push('/admin/newsletters');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setIsSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, blocks, newsletterId, router]);

  // ── Panels ─────────────────────────────────────────────────────

  const BlockLibraryPanel = (
    <div className="space-y-2">
      <p className="text-white/40 text-xs font-[family-name:var(--font-display)] px-1 mb-3">
        اضغط لإضافة كتلة إلى المحتوى
      </p>
      {BLOCK_LIBRARY.map((config) => (
        <button
          key={config.type}
          onClick={() => addBlock(config)}
          className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-transparent hover:border-gold/20 rounded-xl transition-all text-start group"
        >
          <span className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gold/10 text-gold rounded-lg group-hover:bg-gold/20 transition-colors">
            {config.icon}
          </span>
          <div className="min-w-0">
            <p className="text-white text-sm font-[family-name:var(--font-display)] font-semibold">
              {config.label}
            </p>
            <p className="text-white/40 text-xs">{config.description}</p>
          </div>
          <Plus size={iconSizes.sm} className="flex-shrink-0 text-white/20 group-hover:text-gold transition-colors ms-auto" />
        </button>
      ))}
    </div>
  );

  const CanvasPanel = (
    <div>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {blocks.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <LayoutTemplate size={48} className="text-white/10 mb-4" />
                <p className="text-white/30 font-[family-name:var(--font-display)] text-sm max-w-xs leading-relaxed">
                  ابدأ بإضافة محتوى من اللوحة الجانبية
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {blocks.map((block, index) => (
                  <SortableBlockCard
                    key={block.id}
                    block={block}
                    index={index}
                    total={blocks.length}
                    isEditing={editingBlockId === block.id}
                    onEdit={() =>
                      setEditingBlockId((prev) => (prev === block.id ? null : block.id))
                    }
                    onMove={(dir) => moveBlock(block.id, dir)}
                    onDelete={() => deleteBlock(block.id)}
                    onDataChange={(data) => updateBlockData(block.id, data)}
                    onArticlePick={() => setArticlePickerBlockId(block.id)}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </SortableContext>
      </DndContext>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/newsletters"
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowRight size={iconSizes.lg} />
          </Link>
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-0.5">
              {newsletter ? 'تحرير النشرة' : 'نشرة بريدية جديدة'}
            </h1>
            <div className="flex items-center gap-2">
              <NewsletterStatusBadge status={currentStatus} />
              {blocks.length > 0 && (
                <span className="text-white/30 text-xs font-[family-name:var(--font-display)]">
                  {blocks.length} {blocks.length === 1 ? 'كتلة' : 'كتل'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Desktop quick-save */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || currentStatus === 'sent'}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors font-[family-name:var(--font-display)] text-sm disabled:opacity-40"
          >
            {isSaving ? <Loader2 size={iconSizes.sm} className="animate-spin" /> : <Save size={iconSizes.sm} />}
            حفظ مسودة
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || currentStatus === 'sent' || currentStatus === 'cancelled'}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold/80 text-obsidian rounded-xl font-[family-name:var(--font-display)] font-bold text-sm hover:shadow-gold transition-all disabled:opacity-40"
          >
            {isSending ? <Loader2 size={iconSizes.sm} className="animate-spin" /> : <Send size={iconSizes.sm} />}
            {currentStatus === 'sent' ? 'تم الإرسال' : 'إرسال'}
          </button>
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div className="flex lg:hidden bg-midnight/50 border border-gold/10 rounded-xl p-1 gap-1">
        {[
          { key: 'library', label: 'المكتبة', icon: <Plus size={14} /> },
          { key: 'canvas', label: 'المحتوى', icon: <LayoutTemplate size={14} /> },
          { key: 'settings', label: 'الإعدادات', icon: <Eye size={14} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-[family-name:var(--font-display)] font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-gold text-obsidian'
                : 'text-white/50 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3-panel layout */}
      <div className="flex gap-5 items-start">
        {/* Left — Block library */}
        <aside
          className={`w-56 flex-shrink-0 ${
            activeTab === 'library' ? 'block' : 'hidden'
          } lg:block`}
        >
          <div className="bg-midnight/50 border border-gold/10 rounded-xl p-4 sticky top-4">
            <h2 className="text-white/70 text-xs font-[family-name:var(--font-display)] font-semibold uppercase tracking-widest mb-4 flex items-center gap-2">
              <LayoutTemplate size={12} className="text-gold" />
              مكتبة الكتل
            </h2>
            {BlockLibraryPanel}
          </div>
        </aside>

        {/* Center — Canvas */}
        <main
          className={`flex-1 min-w-0 ${
            activeTab === 'canvas' ? 'block' : 'hidden'
          } lg:block`}
        >
          <div className="bg-midnight/50 border border-gold/10 rounded-xl p-5 min-h-[500px]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white/70 text-xs font-[family-name:var(--font-display)] font-semibold uppercase tracking-widest flex items-center gap-2">
                <LayoutTemplate size={12} className="text-gold" />
                محتوى النشرة
              </h2>
              {blocks.length > 0 && (
                <span className="text-white/30 text-xs font-[family-name:var(--font-display)]">
                  اسحب للترتيب
                </span>
              )}
            </div>
            {CanvasPanel}
          </div>
        </main>

        {/* Right — Settings */}
        <aside
          className={`w-72 flex-shrink-0 ${
            activeTab === 'settings' ? 'block' : 'hidden'
          } lg:block`}
        >
          <div className="sticky top-4">
            <SettingsPanel
              values={settings}
              onChange={(v) => setSettings((prev) => ({ ...prev, ...v }))}
              onSaveDraft={handleSaveDraft}
              onSend={handleSend}
              isSaving={isSaving}
              isSending={isSending}
              status={currentStatus}
            />
          </div>
        </aside>
      </div>

      {/* Article picker modal */}
      <AnimatePresence>
        {articlePickerBlockId && (
          <ArticlePickerModal
            onSelect={handleArticleSelect}
            onClose={() => setArticlePickerBlockId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Status badge ────────────────────────────────────────────────

function NewsletterStatusBadge({ status }: { status: Newsletter['status'] | 'new' }) {
  const config: Record<string, { label: string; className: string }> = {
    new: { label: 'جديد', className: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40' },
    draft: { label: 'مسودة', className: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40' },
    scheduled: { label: 'مجدول', className: 'bg-blue-700/20 text-blue-300 border-blue-600/30' },
    sent: { label: 'تم الإرسال', className: 'bg-green-700/20 text-green-300 border-green-600/30' },
    cancelled: { label: 'ملغي', className: 'bg-red-700/20 text-red-300 border-red-600/30' },
  };

  const c = config[status] ?? config.draft;

  return (
    <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border font-[family-name:var(--font-display)] ${c.className}`}>
      {c.label}
    </span>
  );
}
