import type { DataTableBlock } from '@/types'

interface Props {
  block: DataTableBlock
}

/**
 * DataTableBlock — RTL-native data table with alternating row colors.
 *
 * Uses <table dir="rtl"> for full RTL browser support.
 * Header row: navy background, cream text.
 * Data rows: alternating white / #F5EEDC (cream).
 * Overflow-x wrapper for mobile horizontal scroll.
 */
export function DataTableBlock({ block }: Props) {
  return (
    <div
      style={{ marginBlockStart: '2em', marginBlockEnd: '2em' }}
      className="magazine-data-table"
    >
      {block.title && (
        <p
          dir="rtl"
          style={{
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontWeight: 700,
            fontSize: '1rem',
            color: '#183B4E',
            marginBlockEnd: '0.75rem',
            marginBlockStart: 0,
          }}
        >
          {block.title}
        </p>
      )}

      {/* Horizontal scroll wrapper for mobile */}
      <div style={{ overflowX: 'auto' }}>
        <table
          dir="rtl"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontSize: '0.9rem',
          }}
        >
          {/* Header */}
          <thead>
            <tr>
              {block.headers.map((header, i) => (
                <th
                  key={i}
                  style={{
                    background: '#183B4E',
                    color: '#F5EEDC',
                    fontWeight: 700,
                    textAlign: 'right',
                    padding: '0.75rem 1rem',
                    border: '1px solid rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      background: rowIndex % 2 === 0 ? 'white' : '#F5EEDC',
                      color: '#183B4E',
                      textAlign: 'right',
                      padding: '0.625rem 1rem',
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {block.source && (
        <p
          dir="rtl"
          style={{
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontSize: '0.75rem',
            color: '#DDA853',
            marginBlockStart: '0.5rem',
            marginBlockEnd: 0,
            textAlign: 'start',
          }}
        >
          المصدر: {block.source}
        </p>
      )}
    </div>
  )
}
