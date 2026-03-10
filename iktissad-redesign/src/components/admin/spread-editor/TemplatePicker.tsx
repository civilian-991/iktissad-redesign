'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { SPREAD_TEMPLATES, ZONE_TYPE_COLORS } from '@/lib/spread-templates';
import type { SpreadTemplateDefinition } from '@/lib/spread-templates';

interface Props {
  isOpen: boolean;
  onSelect: (templateId: string) => void;
  onClose: () => void;
  /** If true, shows a content-loss warning before confirming */
  hasContent?: boolean;
}

function TemplateThumbnailSvg({ template }: { template: SpreadTemplateDefinition }) {
  const W = 160;
  const H = 113;

  const parseFractions = (value: string, total: number): number[] => {
    const parts = value.split(/\s+/).filter(Boolean);
    const fractions = parts.map((p) => {
      if (p === '1fr') return 1;
      if (p.endsWith('fr')) return parseFloat(p);
      if (p.endsWith('%')) return parseFloat(p) / 100;
      if (p === 'auto') return 0.15;
      return 0.5;
    });
    const sum = fractions.reduce((a, b) => a + b, 0) || 1;
    return fractions.map((f) => (f / sum) * total);
  };

  const colWidths = parseFractions(template.gridColumns, W);
  const rowHeights = parseFractions(template.gridRows, H);

  const areaLines = template.gridTemplate
    .replace(/"/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const cellMap: Record<string, string> = {};
  areaLines.forEach((line, rowIdx) => {
    line.split(/\s+/).forEach((cell, colIdx) => {
      if (cell !== '.') cellMap[`${rowIdx},${colIdx}`] = cell;
    });
  });

  const zoneBounds: Record<string, { x: number; y: number; w: number; h: number }> = {};
  for (const zone of template.zones) {
    let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
    for (const [key, name] of Object.entries(cellMap)) {
      if (name === zone.gridArea) {
        const [r, c] = key.split(',').map(Number);
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
    if (minRow === Infinity) continue;

    const x = colWidths.slice(0, minCol).reduce((a, b) => a + b, 0);
    const y = rowHeights.slice(0, minRow).reduce((a, b) => a + b, 0);
    const w = colWidths.slice(minCol, maxCol + 1).reduce((a, b) => a + b, 0);
    const h = rowHeights.slice(minRow, maxRow + 1).reduce((a, b) => a + b, 0);
    zoneBounds[zone.id] = { x, y, w, h };
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="w-full h-auto rounded-lg">
      <rect width={W} height={H} fill="#0f1e28" rx="4" />
      {template.zones.map((zone) => {
        const b = zoneBounds[zone.id];
        if (!b) return null;
        const color = ZONE_TYPE_COLORS[zone.type] ?? '#27548A';
        return (
          <g key={zone.id}>
            <rect
              x={b.x + 1.5}
              y={b.y + 1.5}
              width={Math.max(0, b.w - 3)}
              height={Math.max(0, b.h - 3)}
              fill={color}
              fillOpacity={0.65}
              rx={2}
            />
            {/* Zone type label (only for larger zones) */}
            {b.w > 30 && b.h > 16 && (
              <text
                x={b.x + b.w / 2}
                y={b.y + b.h / 2 + 3}
                textAnchor="middle"
                fontSize={7}
                fill="rgba(255,255,255,0.7)"
                fontFamily="monospace"
              >
                {zone.type}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function TemplatePicker({ isOpen, onSelect, onClose, hasContent = false }: Props) {
  const { t } = useTranslation();

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-midnight border border-gold/20 rounded-2xl shadow-2xl z-50 overflow-hidden"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
              <div>
                <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                  {t('admin.spreads.templatePicker.title')}
                </h2>
                <p className="text-white/50 text-sm mt-0.5">
                  اختر قالب الصفحة من القوالب التالية
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content-loss warning */}
            {hasContent && (
              <div className="mx-6 mt-4 flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-yellow-300 text-sm font-[family-name:var(--font-display)]">
                  {t('admin.spreads.templatePicker.warning')}
                </p>
              </div>
            )}

            {/* Template Grid */}
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
              {SPREAD_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelect(template.id)}
                  className="group flex flex-col rounded-xl border border-gold/15 hover:border-gold bg-white/3 hover:bg-gold/5 transition-all overflow-hidden text-start"
                >
                  {/* SVG preview */}
                  <div className="p-2 bg-obsidian/50">
                    <TemplateThumbnailSvg template={template} />
                  </div>

                  {/* Name */}
                  <div className="px-3 py-2">
                    <p className="text-white/90 text-sm font-[family-name:var(--font-display)] font-medium leading-tight group-hover:text-gold transition-colors">
                      {template.nameAr}
                    </p>
                    <p className="text-white/35 text-[10px] mt-0.5">
                      {template.zones.length} مناطق
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
