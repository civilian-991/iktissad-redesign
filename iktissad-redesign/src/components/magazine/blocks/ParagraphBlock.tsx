import type { ParagraphBlock } from '@/types'

interface Props {
  block: ParagraphBlock
  isFirst?: boolean
}

/**
 * ParagraphBlock — RTL justified body text with Arabic typography conventions.
 *
 * - text-align: justify + text-justify: auto  → enables kashida on Chrome/Edge
 * - hyphens: none + word-break: keep-all      → prevents broken Arabic words
 * - First paragraph in sequence has no indent (handled by parent via isFirst prop)
 * - Subsequent paragraphs get 1.5em text-indent
 *
 * The block.html field may contain inline HTML marks (<strong>, <em>, <a>).
 * We render it via dangerouslySetInnerHTML since it comes from a trusted CMS.
 */
export function ParagraphBlock({ block, isFirst = false }: Props) {
  const dir = block.dir ?? 'rtl'

  return (
    <p
      dir={dir}
      style={{
        fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
        fontSize: 'clamp(1rem, 1.5vw, 1.125rem)',
        lineHeight: '1.8',
        textAlign: 'justify',
        textJustify: 'auto',
        hyphens: 'none',
        wordBreak: 'keep-all',
        color: '#183B4E',
        textIndent: isFirst ? '0' : '1.5em',
        marginBlockEnd: '0',
        marginBlockStart: '0',
      }}
      className="magazine-paragraph"
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  )
}
