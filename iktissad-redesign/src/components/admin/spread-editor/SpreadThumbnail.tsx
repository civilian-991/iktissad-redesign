'use client';

import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { MagazineSpread } from '@/types';
import { SPREAD_TEMPLATE_MAP, ZONE_TYPE_COLORS } from '@/lib/spread-templates';

interface Props {
  spread: MagazineSpread;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onChangeTemplate: () => void;
}

function TemplateSvgPreview({ templateId }: { templateId: string }) {
  const template = SPREAD_TEMPLATE_MAP.get(templateId);
  if (!template) {
    return (
      <div className="w-full h-full bg-white/5 rounded flex items-center justify-center">
        <Layers size={16} className="text-white/20" />
      </div>
    );
  }

  // Generate a simple SVG based on zone grid areas
  // We create a 120×85 SVG with zones drawn as colored rectangles
  // For simplicity we split zones evenly based on count and type
  const zones = template.zones;
  const W = 120;
  const H = 85;

  // Parse grid columns and rows into fraction-based sizes
  const parseFractions = (template_value: string, total: number): number[] => {
    const parts = template_value.split(/\s+/).filter(Boolean);
    const fractions = parts.map((p) => {
      if (p === '1fr') return 1;
      if (p.endsWith('fr')) return parseFloat(p);
      if (p.endsWith('%')) return parseFloat(p) / 100;
      if (p === 'auto') return 0.15;
      return 0.5;
    });
    const sum = fractions.reduce((a, b) => a + b, 0);
    return fractions.map((f) => (f / sum) * total);
  };

  const colWidths = parseFractions(template.gridColumns, W);
  const rowHeights = parseFractions(template.gridRows, H);

  // Parse grid-template-areas string to get zone positions
  const areaLines = template.gridTemplate
    .replace(/"/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Build a grid cell map: row x col -> zoneId
  const cellMap: Record<string, string> = {};
  areaLines.forEach((line, rowIdx) => {
    line.split(/\s+/).forEach((cell, colIdx) => {
      if (cell !== '.') {
        cellMap[`${rowIdx},${colIdx}`] = cell;
      }
    });
  });

  // Find bounding box for each zone
  const zoneBounds: Record<string, { x: number; y: number; w: number; h: number }> = {};
  for (const zone of zones) {
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
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="w-full h-full rounded">
      <rect width={W} height={H} fill="#1a2e3b" />
      {zones.map((zone) => {
        const b = zoneBounds[zone.id];
        if (!b) return null;
        const color = ZONE_TYPE_COLORS[zone.type] ?? '#27548A';
        return (
          <rect
            key={zone.id}
            x={b.x + 1}
            y={b.y + 1}
            width={Math.max(0, b.w - 2)}
            height={Math.max(0, b.h - 2)}
            fill={color}
            fillOpacity={0.7}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

export default function SpreadThumbnail({
  spread,
  index: _index,
  isSelected,
  onClick,
  onDelete,
  onChangeTemplate,
}: Props) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spread.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg border transition-all cursor-pointer select-none ${
        isSelected
          ? 'border-gold bg-gold/10'
          : 'border-gold/15 bg-white/3 hover:border-gold/30'
      }`}
      onClick={onClick}
      onContextMenu={handleContextMenu}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 end-1 z-10 p-0.5 text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={12} />
      </div>

      {/* Template preview SVG */}
      <div className="aspect-[4/3] overflow-hidden rounded-t-lg">
        <TemplateSvgPreview templateId={spread.templateId} />
      </div>

      {/* Page number */}
      <div className="px-2 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-mono text-white/50">
          {spread.pageNumber}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-gold' : 'bg-white/20'}`} />
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {showContextMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowContextMenu(false)}
            />
            <motion.div
              ref={contextMenuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="absolute start-full top-0 ms-1 z-50 min-w-[140px] bg-midnight border border-gold/20 rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 text-white/80 hover:text-white hover:bg-white/5 text-xs font-[family-name:var(--font-display)] transition-colors"
                onClick={() => {
                  onChangeTemplate();
                  setShowContextMenu(false);
                }}
              >
                <Layers size={13} />
                تغيير القالب
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-[family-name:var(--font-display)] transition-colors"
                onClick={() => {
                  onDelete();
                  setShowContextMenu(false);
                }}
              >
                <Trash2 size={13} />
                حذف الصفحة
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
