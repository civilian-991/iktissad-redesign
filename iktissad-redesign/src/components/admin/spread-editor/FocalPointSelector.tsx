'use client';

import { useRef, useCallback } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n';

interface Props {
  imageUrl: string;
  focalX: number;
  focalY: number;
  onChange: (x: number, y: number) => void;
}

export default function FocalPointSelector({ imageUrl, focalX, focalY, onChange }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const calculatePoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clamp((clientX - rect.left) / rect.width);
      const y = clamp((clientY - rect.top) / rect.height);
      onChange(x, y);
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    calculatePoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    calculatePoint(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    calculatePoint(e.clientX, e.clientY);
  };

  // Keyboard arrow key support for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    let newX = focalX;
    let newY = focalY;
    if (e.key === 'ArrowRight') { newX = Math.min(1, focalX + step); e.preventDefault(); }
    if (e.key === 'ArrowLeft')  { newX = Math.max(0, focalX - step); e.preventDefault(); }
    if (e.key === 'ArrowDown')  { newY = Math.min(1, focalY + step); e.preventDefault(); }
    if (e.key === 'ArrowUp')    { newY = Math.max(0, focalY - step); e.preventDefault(); }
    if (newX !== focalX || newY !== focalY) onChange(newX, newY);
  };

  return (
    <div className="space-y-3">
      {/* Selector area */}
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label={`${t('admin.spreads.focalPoint.label')} — X: ${Math.round(focalX * 100)}%, Y: ${Math.round(focalY * 100)}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(focalX * 100)}
        className="relative w-full rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-gold/60"
        style={{ aspectRatio: '16/9', cursor: 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* Image */}
        <Image
          src={imageUrl}
          alt="Focal point"
          fill
          className="pointer-events-none"
          style={{ objectFit: 'cover' }}
          sizes="280px"
          draggable={false}
        />

        {/* Crosshair guide lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(221,168,83,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(221,168,83,0.2) 1px, transparent 1px)`,
            backgroundSize: '33.33% 33.33%',
          }}
        />

        {/* Focal point indicator */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${focalX * 100}%`,
            top: `${focalY * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* White ring */}
          <div
            className="absolute rounded-full border-2 border-white"
            style={{
              width: 20,
              height: 20,
              top: -10,
              left: -10,
            }}
          />
          {/* Gold dot */}
          <div
            className="absolute rounded-full bg-gold"
            style={{
              width: 12,
              height: 12,
              top: -6,
              left: -6,
            }}
          />
          {/* Shadow ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: 24,
              height: 24,
              top: -12,
              left: -12,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
              borderRadius: '50%',
            }}
          />
        </div>
      </div>

      {/* Label + coordinates */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60 font-[family-name:var(--font-display)]">
          {t('admin.spreads.focalPoint.label')}
        </span>
        <span className="text-white/40 font-mono tabular-nums">
          X: {focalX.toFixed(2)}  Y: {focalY.toFixed(2)}
        </span>
      </div>

      {/* Preview at object-position */}
      <div>
        <p className="text-white/40 text-[10px] mb-1.5 font-[family-name:var(--font-display)]">
          {t('admin.spreads.focalPoint.hint')}
        </p>
        <div
          className="relative rounded-lg overflow-hidden border border-gold/15"
          style={{ width: '100%', height: 80 }}
        >
          <Image
            src={imageUrl}
            alt="Preview"
            fill
            style={{
              objectFit: 'cover',
              objectPosition: `${focalX * 100}% ${focalY * 100}%`,
            }}
            sizes="280px"
          />
        </div>
      </div>
    </div>
  );
}
