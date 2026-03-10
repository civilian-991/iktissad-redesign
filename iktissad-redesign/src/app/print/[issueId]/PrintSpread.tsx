/**
 * PrintSpread — Server component rendering a single magazine spread for PDF export.
 * Renders zones as positioned/grid elements based on template_id.
 * No interactivity — print-mode only.
 */

interface Spread {
  id: string
  page_number: number
  template_id: string
  zones: Record<string, unknown>
  metadata: Record<string, unknown>
}

interface ZoneContent {
  type?: string
  src?: string
  alt?: string
  caption?: string
  credit?: string
  focalX?: number
  focalY?: number
  html?: string
  text?: string
  attribution?: string
  title?: string
  body?: string
}

// ── Template grid definitions ──────────────────────────────────

type GridTemplate = {
  areas: string
  columns: string
  rows: string
  zoneAreas: Record<string, string>
}

const TEMPLATE_GRIDS: Record<string, GridTemplate> = {
  'hero-left': {
    areas: `"image text"`,
    columns: '60% 40%',
    rows: '100%',
    zoneAreas: { image: 'image', text: 'text' },
  },
  'hero-right': {
    areas: `"text image"`,
    columns: '40% 60%',
    rows: '100%',
    zoneAreas: { image: 'image', text: 'text' },
  },
  'hero-full': {
    areas: `"image"`,
    columns: '100%',
    rows: '100%',
    zoneAreas: { image: 'image' },
  },
  'two-column': {
    areas: `"left right"`,
    columns: '50% 50%',
    rows: '100%',
    zoneAreas: { left: 'left', right: 'right' },
  },
  'text-heavy': {
    areas: `"header header" "col1 col2"`,
    columns: '50% 50%',
    rows: '20% 80%',
    zoneAreas: { header: 'header', col1: 'col1', col2: 'col2' },
  },
  'opening-spread': {
    areas: `"image image" "title text"`,
    columns: '60% 40%',
    rows: '60% 40%',
    zoneAreas: { image: 'image', title: 'title', text: 'text' },
  },
}

// Default grid for unknown templates
const DEFAULT_GRID: GridTemplate = {
  areas: `"content"`,
  columns: '100%',
  rows: '100%',
  zoneAreas: { content: 'content' },
}

// ── Zone renderer ──────────────────────────────────────────────

function renderZone(zoneId: string, content: ZoneContent | unknown): React.ReactNode {
  const c = (content ?? {}) as ZoneContent

  if (c.type === 'image' || c.src) {
    return (
      <div
        className="zone zone-image"
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      >
        {c.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.src}
            alt={c.alt ?? ''}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: `${(c.focalX ?? 0.5) * 100}% ${(c.focalY ?? 0.5) * 100}%`,
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'rgba(24,59,78,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(24,59,78,0.4)',
              fontSize: '0.875rem',
            }}
          >
            {zoneId}
          </div>
        )}
        {c.caption && (
          <p
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              left: 0,
              padding: '0.5rem 0.75rem',
              background: 'rgba(0,0,0,0.5)',
              color: '#F5EEDC',
              fontSize: '0.75rem',
            }}
          >
            {c.caption}
            {c.credit && (
              <span style={{ marginInlineStart: '0.5rem', opacity: 0.7 }}>
                {c.credit}
              </span>
            )}
          </p>
        )}
      </div>
    )
  }

  if (c.type === 'pullQuote' || c.attribution !== undefined) {
    return (
      <div
        className="zone zone-pullquote"
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        <blockquote>{c.text ?? c.html ?? ''}</blockquote>
        {c.attribution && <cite>{c.attribution}</cite>}
      </div>
    )
  }

  // Default: text zone
  if (c.html) {
    return (
      <div
        className="zone zone-text"
        style={{ width: '100%', height: '100%' }}
        // dangerouslySetInnerHTML is safe here — admin-controlled content only
        dangerouslySetInnerHTML={{ __html: c.html }}
      />
    )
  }

  if (c.title || c.text || c.body) {
    return (
      <div className="zone zone-text" style={{ width: '100%', height: '100%' }}>
        {c.title && <h2>{c.title}</h2>}
        {(c.text ?? c.body) && <p>{c.text ?? c.body}</p>}
      </div>
    )
  }

  // Empty zone placeholder
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(24,59,78,0.04)',
        color: 'rgba(24,59,78,0.25)',
        fontSize: '0.75rem',
        border: '1px dashed rgba(24,59,78,0.1)',
      }}
    >
      {zoneId}
    </div>
  )
}

// ── PrintSpread ────────────────────────────────────────────────

export default function PrintSpread({
  spread,
  issueNumber,
}: {
  spread: Spread
  issueNumber: number
}) {
  const grid = TEMPLATE_GRIDS[spread.template_id] ?? DEFAULT_GRID
  const zones = (spread.zones ?? {}) as Record<string, unknown>
  const metadata = (spread.metadata ?? {}) as Record<string, string>
  const bg = metadata.backgroundColor ?? '#F5EEDC'

  const zoneEntries = Object.entries(grid.zoneAreas)

  return (
    <div
      className="spread-container"
      data-page={spread.page_number}
      style={{
        gridTemplateAreas: grid.areas,
        gridTemplateColumns: grid.columns,
        gridTemplateRows: grid.rows,
        background: bg,
      }}
    >
      {/* Spine shadow */}
      <div className="spine-shadow" aria-hidden="true" />

      {/* Zones */}
      {zoneEntries.map(([zoneId, gridArea]) => (
        <div
          key={zoneId}
          style={{ gridArea, position: 'relative', overflow: 'hidden' }}
        >
          {renderZone(zoneId, zones[zoneId])}
        </div>
      ))}

      {/* Page folio */}
      <div className="folio folio-end">
        {spread.page_number} | اقتصاد · العدد {issueNumber}
      </div>
    </div>
  )
}
