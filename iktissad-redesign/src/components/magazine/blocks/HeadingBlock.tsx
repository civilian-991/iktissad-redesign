import type { HeadingBlock } from '@/types'

interface Props {
  block: HeadingBlock
  isFirstOnPage?: boolean
}

/**
 * HeadingBlock — Magazine-level section headings.
 *
 * level 2: Playfair Display display heading (largest) — #183B4E
 * level 3: Tajawal bold — #183B4E
 * level 4: Tajawal bold — #27548A (blue, for sub-sections)
 *
 * Note: The ArticleBlock type uses level 2|3|4 (not 1|2|3 as in the spec).
 * We map: block.level 2 → <h2>, 3 → <h3>, 4 → <h4>
 */
export function HeadingBlock({ block, isFirstOnPage = false }: Props) {
  const marginTop = isFirstOnPage ? '0' : '1.5em'

  const stylesByLevel: Record<number, React.CSSProperties> = {
    2: {
      fontFamily: "var(--font-accent, 'Playfair Display', serif)",
      fontSize: 'clamp(2rem, 4vw, 3rem)',
      fontWeight: 700,
      color: '#183B4E',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      marginBlockStart: marginTop,
      marginBlockEnd: '0.75em',
    },
    3: {
      fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
      fontSize: 'clamp(1.5rem, 3vw, 2rem)',
      fontWeight: 700,
      color: '#183B4E',
      lineHeight: 1.3,
      marginBlockStart: marginTop,
      marginBlockEnd: '0.75em',
    },
    4: {
      fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
      fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
      fontWeight: 700,
      color: '#27548A',
      lineHeight: 1.4,
      marginBlockStart: marginTop,
      marginBlockEnd: '0.75em',
    },
  }

  const style = stylesByLevel[block.level] ?? stylesByLevel[3]
  const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4'

  return (
    <Tag style={style} dir="rtl" className="magazine-heading">
      {block.text}
    </Tag>
  )
}
