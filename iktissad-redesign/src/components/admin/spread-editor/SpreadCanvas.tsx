'use client';

import { useDroppable } from '@dnd-kit/core';
import Image from 'next/image';
import type { SpreadTemplateDefinition, SpreadZoneDefinition } from '@/lib/spread-templates';

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
  bgColor?: string;
  [key: string]: unknown;
}

interface Props {
  template: SpreadTemplateDefinition;
  zones: Record<string, ZoneContent>;
  selectedZoneId: string | null;
  onZoneSelect: (zoneId: string) => void;
  onZoneDrop: (zoneId: string, content: { url: string; [key: string]: unknown }) => void;
}

// ─── Individual Zone Cell ─────────────────────────────────────────

function ZoneCell({
  zone,
  content,
  isSelected,
  onSelect,
}: {
  zone: SpreadZoneDefinition;
  content: ZoneContent | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `zone-${zone.id}`,
    data: { zoneId: zone.id, zoneType: zone.type },
  });

  const objectFit = content?.fit ?? 'cover';
  const focalX = content?.focalX ?? 0.5;
  const focalY = content?.focalY ?? 0.5;

  const fontSizeClass =
    zone.type === 'headline'
      ? {
          small: 'text-sm',
          normal: 'text-lg',
          large: 'text-2xl',
          xl: 'text-4xl',
        }[content?.fontSize ?? 'normal']
      : {
          small: 'text-xs',
          normal: 'text-sm',
          large: 'text-base',
          xl: 'text-lg',
        }[content?.fontSize ?? 'normal'];

  const fontWeightClass =
    {
      normal: 'font-normal',
      medium: 'font-medium',
      bold: 'font-bold',
    }[content?.fontWeight ?? 'normal'] ?? 'font-normal';

  const textColor = content?.color
    ? undefined
    : zone.type === 'headline'
    ? 'text-white'
    : zone.type === 'pull-quote'
    ? 'text-gold'
    : zone.type === 'byline'
    ? 'text-white/70'
    : 'text-white/80';

  const bgColor = content?.bgColor ?? undefined;

  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      style={{
        gridArea: zone.gridArea,
        backgroundColor: bgColor,
        outline: isSelected
          ? '2px dashed #DDA853'
          : isOver
          ? '2px solid #DDA853'
          : '1px solid rgba(221,168,83,0.12)',
        outlineOffset: isSelected ? '0px' : '-1px',
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      className={`transition-all group ${isOver ? 'bg-gold/10' : ''}`}
    >
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/5 transition-colors pointer-events-none z-10" />

      {/* Zone type badge (always visible for empty zones) */}
      {!content?.imageUrl && !content?.text && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
          <span
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{
              color: 'rgba(221,168,83,0.6)',
              borderColor: 'rgba(221,168,83,0.2)',
              backgroundColor: 'rgba(221,168,83,0.05)',
            }}
          >
            {zone.type}
          </span>
          <span className="text-[9px] text-white/30 font-[family-name:var(--font-display)]">
            {zone.labelAr}
          </span>
          {zone.type === 'image' && (
            <span className="text-[8px] text-white/20 mt-1">اسحب صورة هنا</span>
          )}
        </div>
      )}

      {/* IMAGE zone */}
      {zone.type === 'image' && content?.imageUrl && (
        <div className="absolute inset-0">
          <Image
            src={content.imageUrl}
            alt={content.caption ?? zone.labelAr}
            fill
            className="pointer-events-none"
            style={{
              objectFit,
              objectPosition: `${focalX * 100}% ${focalY * 100}%`,
            }}
            sizes="(max-width: 1200px) 50vw, 420px"
          />
          {content.caption && (
            <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-2 py-1 font-[family-name:var(--font-display)] line-clamp-1">
              {content.caption}
            </div>
          )}
        </div>
      )}

      {/* TEXT zones */}
      {(zone.type === 'headline' ||
        zone.type === 'body' ||
        zone.type === 'pull-quote' ||
        zone.type === 'byline' ||
        zone.type === 'sidebar') &&
        content?.text && (
          <div
            className={`p-3 h-full overflow-hidden leading-snug ${fontSizeClass} ${fontWeightClass} ${textColor ?? ''} font-[family-name:var(--font-display)]`}
            style={{ color: content.color ?? undefined }}
          >
            {zone.type === 'pull-quote' && (
              <span className="text-gold text-2xl leading-none">&ldquo;</span>
            )}
            <span className="line-clamp-6">{content.text}</span>
            {zone.type === 'pull-quote' && (
              <span className="text-gold text-2xl leading-none float-left">&rdquo;</span>
            )}
          </div>
        )}

      {/* AD zone */}
      {zone.type === 'ad' && content?.imageUrl && (
        <div className="absolute inset-0">
          <Image
            src={content.imageUrl}
            alt="إعلان"
            fill
            className="pointer-events-none"
            style={{ objectFit: 'contain' }}
            sizes="420px"
          />
        </div>
      )}

      {/* DATAVIZ zone */}
      {zone.type === 'dataviz' && content?.imageUrl && (
        <div className="absolute inset-0">
          <Image
            src={content.imageUrl}
            alt="بيانات مرئية"
            fill
            className="pointer-events-none"
            style={{ objectFit: 'contain' }}
            sizes="420px"
          />
        </div>
      )}

      {/* Selected indicator (zone label) */}
      {isSelected && (
        <div className="absolute top-1 start-1 bg-gold text-ink text-[9px] font-bold px-1.5 py-0.5 rounded z-20 pointer-events-none">
          {zone.labelAr}
        </div>
      )}
    </div>
  );
}

// ─── SpreadCanvas ──────────────────────────────────────────────────

export default function SpreadCanvas({
  template,
  zones,
  selectedZoneId,
  onZoneSelect,
  onZoneDrop: _onZoneDrop,
}: Props) {
  // A4 landscape spread ratio: 420mm × 297mm = 1.414:1
  // We render at a fixed 840px × 594px and scale to fit the container
  const CANVAS_W = 840;
  const CANVAS_H = 594;

  return (
    <div
      className="relative bg-[#F5EEDC] shadow-2xl shadow-black/40"
      style={{
        width: CANVAS_W,
        height: CANVAS_H,
        maxWidth: '100%',
        aspectRatio: `${CANVAS_W}/${CANVAS_H}`,
        display: 'grid',
        gridTemplateAreas: template.gridTemplate,
        gridTemplateColumns: template.gridColumns,
        gridTemplateRows: template.gridRows,
      }}
    >
      {template.zones.map((zone) => (
        <ZoneCell
          key={zone.id}
          zone={zone}
          content={zones[zone.id] ?? null}
          isSelected={selectedZoneId === zone.id}
          onSelect={() => onZoneSelect(zone.id)}
        />
      ))}
    </div>
  );
}
