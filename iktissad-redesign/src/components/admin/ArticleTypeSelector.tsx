'use client';

/**
 * ArticleTypeSelector
 *
 * A dropdown for selecting the editorial article type (خبر، تقرير، تحليل، مقابلة، رأي).
 * Shows word count targets and a collapsible info card with structure/tone details.
 * RTL-aware, matches existing admin dark-theme form field aesthetic.
 */

import { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ArticleType,
  ALL_ARTICLE_TYPES,
  getStylePreset,
  getWordCountTarget,
} from '@/lib/ai/arabic-editorial';
import type { ArticleTypeConfig } from '@/lib/ai/arabic-editorial';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ArticleTypeSelectorProps {
  value: ArticleType | null;
  onChange: (type: ArticleType, config: ArticleTypeConfig) => void;
  /** Show the word count target hint below the dropdown. Defaults to true. */
  showWordCount?: boolean;
}

// ─── Badge color per type ────────────────────────────────────────────────────

function typeColor(type: ArticleType): string {
  switch (type) {
    case ArticleType.NEWS:      return 'text-zinc-300 bg-zinc-700/40 border-zinc-600/40';
    case ArticleType.REPORT:    return 'text-blue-300 bg-blue-700/20 border-blue-600/30';
    case ArticleType.ANALYSIS:  return 'text-purple-300 bg-purple-700/20 border-purple-600/30';
    case ArticleType.INTERVIEW: return 'text-amber-300 bg-amber-700/20 border-amber-600/30';
    case ArticleType.OPINION:   return 'text-green-300 bg-green-700/20 border-green-600/30';
    default:                    return 'text-white/60 bg-white/5 border-white/10';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ArticleTypeSelector({
  value,
  onChange,
  showWordCount = true,
}: ArticleTypeSelectorProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const selectedConfig = value ? getStylePreset(value) : null;
  const wordCounts = value ? getWordCountTarget(value) : null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    if (!raw) return;
    const type = raw as ArticleType;
    const config = getStylePreset(type);
    onChange(type, config);
    setShowInfo(false);
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <label className="text-white/70 text-sm font-[family-name:var(--font-display)]">
          نوع المقال
        </label>
        {/* Info icon with tooltip */}
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="text-white/30 hover:text-gold transition-colors"
            aria-label="معلومات عن نوع المقال"
          >
            <Info size={14} />
          </button>
          {showTooltip && (
            <div className="absolute start-0 top-6 z-20 w-56 rounded-xl bg-obsidian/95 border border-gold/20 p-3 text-xs text-white/70 font-[family-name:var(--font-display)] shadow-elevated">
              يحدد نوع المقال البنية الهيكلية المقترحة وعدد الكلمات المستهدف
              ويوجّه نبرة الكتابة وأسلوبها.
            </div>
          )}
        </div>
      </div>

      {/* Dropdown */}
      <select
        value={value ?? ''}
        onChange={handleChange}
        className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 transition-colors appearance-none cursor-pointer"
        style={{ direction: 'rtl' }}
      >
        <option value="" className="bg-midnight text-white/50">
          -- اختر نوع المقال --
        </option>
        {ALL_ARTICLE_TYPES.map((type) => {
          const cfg = getStylePreset(type);
          return (
            <option key={type} value={type} className="bg-midnight text-white">
              {cfg.arabicName} — {cfg.arabicLabel}
            </option>
          );
        })}
      </select>

      {/* Word count hint */}
      {showWordCount && wordCounts && (
        <p className="text-xs text-white/40 font-[family-name:var(--font-display)]">
          عدد الكلمات المقترح:{' '}
          <span className="text-white/60">
            {wordCounts.min.toLocaleString('ar-u-nu-latn')}–{wordCounts.max.toLocaleString('ar-u-nu-latn')}
          </span>
          {' '}(مثالي:{' '}
          <span className="text-gold/70">{wordCounts.ideal.toLocaleString('ar-u-nu-latn')}</span>
          )
        </p>
      )}

      {/* Collapsible info card */}
      {selectedConfig && (
        <div className="rounded-xl border border-gold/10 bg-white/3 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-start hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-md border font-[family-name:var(--font-display)] font-semibold ${typeColor(selectedConfig.type)}`}
              >
                {selectedConfig.arabicName}
              </span>
              <span className="text-white/60 text-xs font-[family-name:var(--font-display)]">
                {selectedConfig.arabicLabel}
              </span>
            </span>
            {showInfo ? (
              <ChevronUp size={14} className="text-white/40 flex-shrink-0" />
            ) : (
              <ChevronDown size={14} className="text-white/40 flex-shrink-0" />
            )}
          </button>

          {showInfo && (
            <div className="px-4 pb-4 space-y-3 border-t border-gold/5 pt-3">
              <div>
                <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-1">
                  البنية الهيكلية
                </p>
                <p className="text-white/70 text-sm font-[family-name:var(--font-display)] leading-relaxed">
                  {selectedConfig.structure}
                </p>
              </div>
              <div>
                <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-1">
                  النبرة والأسلوب
                </p>
                <p className="text-white/70 text-sm font-[family-name:var(--font-display)] leading-relaxed">
                  {selectedConfig.tone}
                </p>
              </div>
              {selectedConfig.outlineTemplate.length > 0 && (
                <div>
                  <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-1.5">
                    الأقسام المقترحة
                  </p>
                  <ol className="space-y-1">
                    {selectedConfig.outlineTemplate.map((section, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-xs font-[family-name:var(--font-display)] text-white/60"
                      >
                        <span className="w-4 h-4 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] flex-shrink-0">
                          {i + 1}
                        </span>
                        {section}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
