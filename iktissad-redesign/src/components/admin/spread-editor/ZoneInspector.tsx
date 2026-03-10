'use client';

import { useState } from 'react';
import { Trash2, Image as ImageIcon, Type, BarChart2, Megaphone, Layers } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { SpreadZoneDefinition } from '@/lib/spread-templates';
import FocalPointSelector from './FocalPointSelector';

interface ZoneContent {
  text?: string;
  imageUrl?: string;
  focalX?: number;
  focalY?: number;
  fit?: 'cover' | 'contain' | 'fill';
  caption?: string;
  credit?: string;
  fontSize?: 'small' | 'normal' | 'large' | 'xl';
  fontWeight?: 'normal' | 'medium' | 'bold';
  color?: string;
  adId?: string;
  adUrl?: string;
  chartType?: 'bar' | 'line' | 'pie';
  chartData?: string;
  bgColor?: string;
  padding?: string;
  sectionId?: string;
  [key: string]: unknown;
}

interface Props {
  selectedZone: SpreadZoneDefinition | null;
  zoneContent: ZoneContent | null;
  onUpdate: (zoneId: string, content: ZoneContent) => void;
  onStyleUpdate: (zoneId: string, style: Record<string, unknown>) => void;
}

// ─── Helper components ─────────────────────────────────────────────

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5"
    >
      {children}
    </label>
  );
}

function Select({
  id,
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  'aria-label'?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="w-full bg-white/5 border border-gold/15 rounded-lg py-1.5 px-2.5 text-white text-xs font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/40 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-midnight">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  'aria-label': ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  'aria-label'?: string;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      aria-label={ariaLabel}
      className="w-full bg-white/5 border border-gold/15 rounded-lg py-2 px-3 text-white text-xs font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/40 transition-colors resize-none"
    />
  );
}

function Input({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  'aria-label': ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  'aria-label'?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="w-full bg-white/5 border border-gold/15 rounded-lg py-1.5 px-2.5 text-white text-xs font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/40 transition-colors"
    />
  );
}

// ─── Zone-specific panels ──────────────────────────────────────────

function ImageZonePanel({
  content,
  zoneId,
  onUpdate,
}: {
  content: ZoneContent;
  zoneId: string;
  onUpdate: (zoneId: string, content: ZoneContent) => void;
}) {
  const { t } = useTranslation();
  const update = (partial: Partial<ZoneContent>) =>
    onUpdate(zoneId, { ...content, ...partial });

  return (
    <div className="space-y-4">
      {/* Current image + focal point */}
      {content.imageUrl ? (
        <div>
          <FieldLabel>{t('admin.spreads.zoneInspector.focalPoint')}</FieldLabel>
          <FocalPointSelector
            imageUrl={content.imageUrl}
            focalX={content.focalX ?? 0.5}
            focalY={content.focalY ?? 0.5}
            onChange={(x, y) => update({ focalX: x, focalY: y })}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gold/20 rounded-xl bg-white/3">
          <ImageIcon size={28} className="text-white/20 mb-2" />
          <p className="text-white/40 text-xs text-center font-[family-name:var(--font-display)]">
            {t('admin.spreads.zoneInspector.noImage')}
          </p>
          <p className="text-white/25 text-[10px] mt-1">
            اسحب من مكتبة الوسائط
          </p>
        </div>
      )}

      {/* Object fit */}
      <div>
        <FieldLabel htmlFor={`${zoneId}-fit`}>{t('admin.spreads.zoneInspector.fit')}</FieldLabel>
        <Select
          id={`${zoneId}-fit`}
          value={content.fit ?? 'cover'}
          onChange={(v) => update({ fit: v as ZoneContent['fit'] })}
          options={[
            { value: 'cover', label: 'Cover (تغطية)' },
            { value: 'contain', label: 'Contain (احتواء)' },
            { value: 'fill', label: 'Fill (ملء)' },
          ]}
        />
      </div>

      {/* Caption */}
      <div>
        <FieldLabel htmlFor={`${zoneId}-caption`}>{t('admin.spreads.zoneInspector.caption')}</FieldLabel>
        <Input
          id={`${zoneId}-caption`}
          value={content.caption ?? ''}
          onChange={(v) => update({ caption: v })}
          placeholder="تعليق الصورة..."
        />
      </div>

      {/* Credit */}
      <div>
        <FieldLabel htmlFor={`${zoneId}-credit`}>{t('admin.spreads.zoneInspector.credit')}</FieldLabel>
        <Input
          id={`${zoneId}-credit`}
          value={content.credit ?? ''}
          onChange={(v) => update({ credit: v })}
          placeholder="المصدر / المصوّر..."
        />
      </div>
    </div>
  );
}

function TextZonePanel({
  content,
  zoneId,
  onUpdate,
}: {
  content: ZoneContent;
  zoneId: string;
  onUpdate: (zoneId: string, content: ZoneContent) => void;
}) {
  const { t } = useTranslation();
  const update = (partial: Partial<ZoneContent>) =>
    onUpdate(zoneId, { ...content, ...partial });

  const colorOptions = [
    { value: '#DDA853', label: 'ذهبي' },
    { value: '#183B4E', label: 'كحلي' },
    { value: '#F5EEDC', label: 'كريمي' },
    { value: '#FFFFFF', label: 'أبيض' },
    { value: '#27548A', label: 'أزرق' },
  ];

  return (
    <div className="space-y-4">
      {/* Text content */}
      <div>
        <FieldLabel htmlFor={`${zoneId}-text`}>{t('admin.spreads.zoneInspector.text')}</FieldLabel>
        <TextArea
          id={`${zoneId}-text`}
          value={content.text ?? ''}
          onChange={(v) => update({ text: v })}
          placeholder="اكتب النص هنا..."
          rows={5}
        />
      </div>

      {/* Font size */}
      <div>
        <FieldLabel>{t('admin.spreads.zoneInspector.fontSize')}</FieldLabel>
        <Select
          value={content.fontSize ?? 'normal'}
          onChange={(v) => update({ fontSize: v as ZoneContent['fontSize'] })}
          options={[
            { value: 'small', label: 'صغير' },
            { value: 'normal', label: 'عادي' },
            { value: 'large', label: 'كبير' },
            { value: 'xl', label: 'كبير جداً' },
          ]}
        />
      </div>

      {/* Font weight */}
      <div>
        <FieldLabel>{t('admin.spreads.zoneInspector.fontWeight')}</FieldLabel>
        <Select
          value={content.fontWeight ?? 'normal'}
          onChange={(v) => update({ fontWeight: v as ZoneContent['fontWeight'] })}
          options={[
            { value: 'normal', label: 'عادي' },
            { value: 'medium', label: 'متوسط' },
            { value: 'bold', label: 'عريض' },
          ]}
        />
      </div>

      {/* Color */}
      <div>
        <FieldLabel>{t('admin.spreads.zoneInspector.color')}</FieldLabel>
        <div className="flex items-center gap-2 flex-wrap">
          {colorOptions.map((c) => (
            <button
              key={c.value}
              title={c.label}
              onClick={() => update({ color: c.value })}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c.value,
                borderColor: content.color === c.value ? '#DDA853' : 'transparent',
                outline: content.color === c.value ? '1px solid #DDA853' : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
          <input
            type="color"
            value={content.color ?? '#FFFFFF'}
            onChange={(e) => update({ color: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer border border-gold/20 bg-transparent"
            title="لون مخصص"
          />
        </div>
      </div>
    </div>
  );
}

function AdZonePanel({
  content,
  zoneId,
  onUpdate,
}: {
  content: ZoneContent;
  zoneId: string;
  onUpdate: (zoneId: string, content: ZoneContent) => void;
}) {
  const update = (partial: Partial<ZoneContent>) =>
    onUpdate(zoneId, { ...content, ...partial });

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>رابط الإعلان</FieldLabel>
        <Input
          value={content.adUrl ?? ''}
          onChange={(v) => update({ adUrl: v })}
          placeholder="https://..."
        />
      </div>
      {content.imageUrl && (
        <div className="rounded-lg overflow-hidden border border-gold/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.imageUrl} alt="Ad preview" className="w-full h-24 object-cover" />
        </div>
      )}
      {!content.imageUrl && (
        <div className="flex items-center justify-center h-20 border-2 border-dashed border-gold/20 rounded-xl bg-white/3">
          <p className="text-white/30 text-xs">اسحب صورة الإعلان هنا</p>
        </div>
      )}
    </div>
  );
}

function DatavizZonePanel({
  content,
  zoneId,
  onUpdate,
}: {
  content: ZoneContent;
  zoneId: string;
  onUpdate: (zoneId: string, content: ZoneContent) => void;
}) {
  const update = (partial: Partial<ZoneContent>) =>
    onUpdate(zoneId, { ...content, ...partial });

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>نوع المخطط</FieldLabel>
        <Select
          value={content.chartType ?? 'bar'}
          onChange={(v) => update({ chartType: v as ZoneContent['chartType'] })}
          options={[
            { value: 'bar', label: 'عمودي (Bar)' },
            { value: 'line', label: 'خطي (Line)' },
            { value: 'pie', label: 'دائري (Pie)' },
          ]}
        />
      </div>
      <div>
        <FieldLabel>البيانات (JSON أو CSV)</FieldLabel>
        <TextArea
          value={content.chartData ?? ''}
          onChange={(v) => update({ chartData: v })}
          placeholder={`[{"label":"2023","value":450},{"label":"2024","value":620}]`}
          rows={6}
        />
      </div>
    </div>
  );
}

// ─── Common styling panel (all zones) ─────────────────────────────

function CommonStylePanel({
  content,
  zoneId,
  onUpdate,
}: {
  content: ZoneContent;
  zoneId: string;
  onUpdate: (zoneId: string, content: ZoneContent) => void;
}) {
  const update = (partial: Partial<ZoneContent>) =>
    onUpdate(zoneId, { ...content, ...partial });

  return (
    <div className="space-y-3 pt-3 border-t border-gold/10">
      <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">
        التخصيص العام
      </p>

      {/* Background color */}
      <div>
        <FieldLabel>لون الخلفية</FieldLabel>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={content.bgColor ?? '#183B4E'}
            onChange={(e) => update({ bgColor: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-gold/20 bg-transparent"
          />
          <button
            onClick={() => update({ bgColor: undefined })}
            className="text-white/40 hover:text-white/60 text-xs transition-colors"
          >
            إزالة
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ZoneInspector ────────────────────────────────────────────────

export default function ZoneInspector({ selectedZone, zoneContent, onUpdate, onStyleUpdate: _onStyleUpdate }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'content' | 'style'>('content');

  if (!selectedZone) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <Layers size={32} className="text-white/15 mb-3" />
        <p className="text-white/40 text-sm font-[family-name:var(--font-display)]">
          {t('admin.spreads.noZoneSelected')}
        </p>
        <p className="text-white/25 text-xs mt-1">
          اضغط على منطقة في الصفحة
        </p>
      </div>
    );
  }

  const content = zoneContent ?? {};

  const zoneIcon = {
    image: <ImageIcon size={14} />,
    headline: <Type size={14} />,
    body: <Type size={14} />,
    'pull-quote': <Type size={14} />,
    byline: <Type size={14} />,
    sidebar: <Layers size={14} />,
    ad: <Megaphone size={14} />,
    dataviz: <BarChart2 size={14} />,
  }[selectedZone.type] ?? <Layers size={14} />;

  const isTextZone = ['headline', 'body', 'pull-quote', 'byline', 'sidebar'].includes(selectedZone.type);

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Zone header */}
      <div className="px-4 py-3 border-b border-gold/10 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gold">{zoneIcon}</span>
          <span className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">
            {selectedZone.labelAr}
          </span>
          <span className="text-white/30 text-[10px] font-mono ms-auto">
            {selectedZone.type}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-2">
          {(['content', 'style'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1 text-xs rounded-lg font-[family-name:var(--font-display)] transition-colors ${
                activeTab === tab
                  ? 'bg-gold/20 text-gold'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab === 'content' ? 'المحتوى' : 'التنسيق'}
            </button>
          ))}
        </div>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'content' ? (
          <>
            {selectedZone.type === 'image' && (
              <ImageZonePanel content={content} zoneId={selectedZone.id} onUpdate={onUpdate} />
            )}
            {isTextZone && (
              <TextZonePanel content={content} zoneId={selectedZone.id} onUpdate={onUpdate} />
            )}
            {selectedZone.type === 'ad' && (
              <AdZonePanel content={content} zoneId={selectedZone.id} onUpdate={onUpdate} />
            )}
            {selectedZone.type === 'dataviz' && (
              <DatavizZonePanel content={content} zoneId={selectedZone.id} onUpdate={onUpdate} />
            )}
          </>
        ) : (
          <CommonStylePanel content={content} zoneId={selectedZone.id} onUpdate={onUpdate} />
        )}
      </div>

      {/* Clear zone button */}
      <div className="p-4 border-t border-gold/10 flex-shrink-0">
        <button
          onClick={() => onUpdate(selectedZone.id, {})}
          className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm font-[family-name:var(--font-display)]"
        >
          <Trash2 size={14} />
          {t('admin.spreads.zoneInspector.clearZone')}
        </button>
      </div>
    </div>
  );
}
