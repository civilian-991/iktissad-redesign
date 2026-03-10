/**
 * FigureNodeView — React NodeView for FigureExtension.
 * Shows image with caption input, credit input, focal point sliders, and width selector.
 * Design tokens: #183B4E obsidian, #DDA853 gold, #F5EEDC cream.
 */

import { useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

const WIDTH_OPTIONS = [
  { value: 'full', label: 'عرض كامل' },
  { value: 'half', label: 'نصف' },
  { value: 'third', label: 'ثلث' },
] as const

export function FigureNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, caption, credit, focalX, focalY, width } = node.attrs as {
    src: string
    alt: string
    caption: string
    credit: string
    focalX: number
    focalY: number
    width: 'full' | 'half' | 'third'
  }

  const [showFocalPoint, setShowFocalPoint] = useState(false)

  const widthStyle: Record<string, string> = {
    full: '100%',
    half: '50%',
    third: '33.333%',
  }

  return (
    <NodeViewWrapper
      as="figure"
      data-type="figure"
      style={{
        display: 'block',
        width: widthStyle[width] ?? '100%',
        margin: '1.5rem auto',
        outline: selected ? '2px solid #DDA853' : 'none',
        outlineOffset: '2px',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        background: '#183B4E',
      }}
    >
      {/* Image */}
      {src ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: `${focalX * 100}% ${focalY * 100}%`,
              display: 'block',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '0.875rem',
          }}
        >
          لا توجد صورة — أدخل رابط الصورة أدناه
        </div>
      )}

      {/* Controls panel */}
      <div
        style={{ padding: '0.75rem', background: 'rgba(24,59,78,0.95)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Alt / src inputs row */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="url"
            value={src}
            onChange={(e) => updateAttributes({ src: e.target.value })}
            placeholder="رابط الصورة..."
            style={inputStyle}
          />
          <input
            type="text"
            value={alt}
            onChange={(e) => updateAttributes({ alt: e.target.value })}
            placeholder="النص البديل..."
            style={{ ...inputStyle, flex: '0 0 30%' }}
          />
        </div>

        {/* Caption */}
        <input
          type="text"
          value={caption}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          placeholder="التسمية التوضيحية..."
          style={{ ...inputStyle, marginBottom: '0.5rem' }}
        />

        {/* Credit */}
        <input
          type="text"
          value={credit}
          onChange={(e) => updateAttributes({ credit: e.target.value })}
          placeholder="المصدر / التصوير..."
          style={{ ...inputStyle, marginBottom: '0.75rem' }}
        />

        {/* Width selector + focal point button */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>العرض:</span>
          {WIDTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateAttributes({ width: opt.value })}
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                border: '1px solid',
                cursor: 'pointer',
                background: width === opt.value ? '#DDA853' : 'transparent',
                borderColor: width === opt.value ? '#DDA853' : 'rgba(221,168,83,0.3)',
                color: width === opt.value ? '#183B4E' : 'rgba(255,255,255,0.7)',
              }}
            >
              {opt.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowFocalPoint(!showFocalPoint)}
            style={{
              marginInlineStart: 'auto',
              padding: '0.25rem 0.625rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              border: '1px solid rgba(221,168,83,0.3)',
              cursor: 'pointer',
              background: showFocalPoint ? 'rgba(221,168,83,0.15)' : 'transparent',
              color: '#DDA853',
            }}
          >
            تعيين نقطة التركيز
          </button>
        </div>

        {/* Focal point sliders */}
        {showFocalPoint && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
              أفقي (X): {Math.round(focalX * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={focalX}
              onChange={(e) => updateAttributes({ focalX: parseFloat(e.target.value) })}
              style={{ accentColor: '#DDA853', width: '100%' }}
            />
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
              عمودي (Y): {Math.round(focalY * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={focalY}
              onChange={(e) => updateAttributes({ focalY: parseFloat(e.target.value) })}
              style={{ accentColor: '#DDA853', width: '100%' }}
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(221,168,83,0.15)',
  borderRadius: '0.5rem',
  padding: '0.375rem 0.625rem',
  color: 'rgba(245,238,220,0.9)',
  fontSize: '0.8125rem',
  outline: 'none',
  width: '100%',
}
