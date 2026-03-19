/**
 * Arabic Editorial AI Identity Layer — Word Count Targets
 * مكتبة الهوية التحريرية العربية للذكاء الاصطناعي — أهداف عدد الكلمات
 *
 * Provides word count range data per article type, exported both as
 * a lookup map and as a standalone accessor function.
 */

import { ArticleType } from './types'

/** Word count range for a single article type */
export interface WordCountTarget {
  min: number
  max: number
  ideal: number
}

/**
 * Word count targets for every article type.
 * Values are in Arabic words (كلمات عربية), aligned with the
 * ArticleTypeConfig definitions in style-presets.ts.
 */
export const WORD_COUNT_TARGETS: Record<ArticleType, WordCountTarget> = {
  [ArticleType.NEWS]: { min: 300, max: 500, ideal: 400 },
  [ArticleType.REPORT]: { min: 800, max: 1500, ideal: 1100 },
  [ArticleType.ANALYSIS]: { min: 1000, max: 2000, ideal: 1500 },
  [ArticleType.INTERVIEW]: { min: 600, max: 1200, ideal: 900 },
  [ArticleType.OPINION]: { min: 500, max: 900, ideal: 700 },
}

/**
 * Returns the word count target (min / max / ideal) for the given article type.
 *
 * @param articleType - The ArticleType enum value to look up
 * @returns WordCountTarget with min, max, and ideal word counts
 * @throws If an unknown article type is supplied
 */
export function getWordCountTarget(articleType: ArticleType): WordCountTarget {
  const target = WORD_COUNT_TARGETS[articleType]
  if (!target) {
    throw new Error(`[arabic-editorial] Unknown article type: "${articleType}"`)
  }
  return target
}
