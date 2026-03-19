/**
 * Arabic Editorial AI Identity Layer — Public API
 * مكتبة الهوية التحريرية العربية للذكاء الاصطناعي — الواجهة العامة
 *
 * Single entry-point for the arabic-editorial module.
 * Import everything from '@/lib/ai/arabic-editorial'.
 *
 * @module arabic-editorial
 */

// ── Types ────────────────────────────────────────────────────────────────────
export { ArticleType, ALL_ARTICLE_TYPES } from './types'
export type {
  ArticleTypeConfig,
  ArabicEditorialSystemPrompt,
  BuildSystemPromptOptions,
} from './types'

// ── Style presets ────────────────────────────────────────────────────────────
export { ARTICLE_TYPE_CONFIGS, getStylePreset } from './style-presets'

// ── Word count targets ───────────────────────────────────────────────────────
export { WORD_COUNT_TARGETS, getWordCountTarget } from './word-count-targets'
export type { WordCountTarget } from './word-count-targets'

// ── Financial context ────────────────────────────────────────────────────────
export {
  FINANCIAL_GLOSSARY,
  MENA_ECONOMIC_CONTEXT,
  PROHIBITED_PHRASES,
  NUMBER_FORMATTING_RULES,
  CITATION_CONVENTIONS,
} from './financial-context'

// ── Prompt builder ───────────────────────────────────────────────────────────
export {
  buildSystemPrompt,
  buildArticleOutline,
  buildContextFragment,
} from './prompt-builder'

