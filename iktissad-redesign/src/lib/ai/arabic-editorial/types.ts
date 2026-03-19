/**
 * Arabic Editorial AI Identity Layer — Type Definitions
 * مكتبة الهوية التحريرية العربية للذكاء الاصطناعي — تعريفات الأنواع
 */

/** Enumeration of supported article types in the editorial system */
export enum ArticleType {
  NEWS = 'news',           // خبر
  REPORT = 'report',       // تقرير
  ANALYSIS = 'analysis',   // تحليل
  INTERVIEW = 'interview', // مقابلة
  OPINION = 'opinion',     // رأي
}

/**
 * Full configuration for a specific article type, including structural,
 * stylistic, and AI-prompt-shaping properties.
 */
export interface ArticleTypeConfig {
  /** The ArticleType enum value */
  type: ArticleType
  /** Short Arabic name, e.g. "خبر" */
  arabicName: string
  /** Full Arabic label, e.g. "تقرير إخباري" */
  arabicLabel: string
  /** English name, e.g. "News" */
  englishName: string
  /** Structural pattern description in Arabic */
  structure: string
  /** Tone / voice description in Arabic */
  tone: string
  /** Minimum acceptable word count */
  wordCountMin: number
  /** Maximum acceptable word count */
  wordCountMax: number
  /** Ideal / target word count */
  wordCountIdeal: number
  /** TipTap-ready heading strings representing the article's structural sections */
  outlineTemplate: string[]
  /** Style directives injected into AI prompts to shape writing behaviour */
  promptDirectives: string[]
}

/**
 * Fully assembled Arabic editorial system prompt structure.
 * Each field is injected as a distinct section of the final prompt string.
 */
export interface ArabicEditorialSystemPrompt {
  /** Role description for the AI (who it is) */
  role: string
  /** Ordered list of style directives relevant to the requested article type */
  styleDirectives: string[]
  /** MENA economic and journalistic context fragment */
  financialContext: string
  /** Loanwords / transliterations to avoid */
  prohibitedPhrases: string[]
  /** Rules for formatting numbers, currencies, and percentages */
  numberFormatting: string
  /** Rules for attributing quotes and data sources */
  citationConventions: string
}

/** Options accepted by the `buildSystemPrompt` function */
export interface BuildSystemPromptOptions {
  /** Type of article being written */
  articleType: ArticleType
  /** Optional topic description injected into the prompt */
  topic?: string
  /** Optional SEO target keyword for the article */
  targetKeyword?: string
  /** Override the default ideal word count for this article type */
  wordCountOverride?: number
}

/** All article types as an ordered array (for rendering select options). */
export const ALL_ARTICLE_TYPES: ArticleType[] = [
  ArticleType.NEWS,
  ArticleType.REPORT,
  ArticleType.ANALYSIS,
  ArticleType.INTERVIEW,
  ArticleType.OPINION,
]
