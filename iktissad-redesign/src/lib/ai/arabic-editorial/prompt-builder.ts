/**
 * Arabic Editorial AI Identity Layer — Prompt Builder
 * مكتبة الهوية التحريرية العربية للذكاء الاصطناعي — منشئ الموجّهات
 *
 * Pure functions that assemble complete Arabic editorial system prompts
 * ready to pass as the `system:` parameter to AI SDK v6 `streamText` / `generateText`.
 *
 * No external dependencies. All functions are pure (no side effects, no API calls).
 */

import { ArticleType, ArticleTypeConfig, BuildSystemPromptOptions } from './types'
import { getStylePreset } from './style-presets'
import { getWordCountTarget } from './word-count-targets'
import {
  MENA_ECONOMIC_CONTEXT,
  FINANCIAL_GLOSSARY,
  PROHIBITED_PHRASES,
  NUMBER_FORMATTING_RULES,
  CITATION_CONVENTIONS,
} from './financial-context'

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a compact, relevant subset of glossary terms to inject into a prompt.
 * Returns a formatted bullet list of up to `limit` terms (default 20) to avoid
 * overwhelming the context window while still grounding the model.
 */
function buildGlossaryFragment(limit = 20): string {
  const entries = Object.entries(FINANCIAL_GLOSSARY).slice(0, limit)
  const lines = entries.map(([en, ar]) => `  - ${en}: ${ar}`)
  return lines.join('\n')
}

/**
 * Formats the prohibited phrases list as a comma-separated inline string.
 */
function buildProhibitedPhrasesInline(): string {
  return PROHIBITED_PHRASES.join('، ')
}

/**
 * Formats the article type's prompt directives as a numbered Arabic list.
 */
function buildDirectivesList(directives: string[]): string {
  return directives.map((d, i) => `${i + 1}. ${d}`).join('\n')
}

/**
 * Formats the outline template as a numbered Arabic list.
 */
function buildOutlineList(outline: string[]): string {
  return outline.map((heading, i) => `${i + 1}. ${heading}`).join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a TipTap-compatible HTML string containing the article outline
 * as `<h2>` headings, ready to pre-populate the editor's initial content.
 *
 * @param articleType - The ArticleType enum value
 * @returns HTML string with ordered `<h2>` elements
 *
 * @example
 * buildArticleOutline(ArticleType.ANALYSIS)
 * // → '<h2>الأطروحة الرئيسية والموقف التحليلي</h2>\n<h2>المعطيات والأدلة الداعمة</h2>...'
 */
export function buildArticleOutline(articleType: ArticleType): string {
  const config: ArticleTypeConfig = getStylePreset(articleType)
  return config.outlineTemplate
    .map((heading) => `<h2>${heading}</h2>`)
    .join('\n')
}

/**
 * Returns a lightweight MENA financial context fragment suitable for short
 * AI actions (excerpt generation, headline suggestions, meta description writing)
 * where a full system prompt would be excessive.
 *
 * Includes: MENA context paragraph + a concise glossary sample.
 *
 * @returns Formatted Arabic context string
 */
export function buildContextFragment(): string {
  const glossarySample = buildGlossaryFragment(15)
  return [
    MENA_ECONOMIC_CONTEXT,
    '',
    '## مصطلحات مالية أساسية للاستخدام الصحيح',
    glossarySample,
  ].join('\n')
}

/**
 * Assembles a complete Arabic editorial system prompt ready to pass as
 * `system:` to AI SDK v6 `streamText` or `generateText`.
 *
 * The prompt is structured into clearly labelled sections:
 * 1. Role & MENA editorial context
 * 2. Article type identity (name, structure, tone)
 * 3. Word count targets (with optional override)
 * 4. Ordered style directives
 * 5. Article outline
 * 6. Financial terminology glossary sample
 * 7. Number formatting rules
 * 8. Citation conventions
 * 9. Prohibited phrases
 * 10. Optional topic/keyword injection
 *
 * @param options - BuildSystemPromptOptions
 * @param options.articleType - Required: the type of article to write
 * @param options.topic - Optional: article topic injected as a context hint
 * @param options.targetKeyword - Optional: SEO keyword for the article
 * @param options.wordCountOverride - Optional: override the ideal word count
 * @returns A single well-formatted Arabic string ready for AI SDK consumption
 *
 * @example
 * const systemPrompt = buildSystemPrompt({
 *   articleType: ArticleType.ANALYSIS,
 *   topic: 'نمو الناتج المحلي السعودي',
 *   targetKeyword: 'اقتصاد المملكة العربية السعودية',
 * })
 * const result = await streamText({ model: 'openai/gpt-5.4', system: systemPrompt, prompt: '...' })
 */
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
  const { articleType, topic, targetKeyword, wordCountOverride } = options

  const config: ArticleTypeConfig = getStylePreset(articleType)
  const wordCount = getWordCountTarget(articleType)
  const idealWords = wordCountOverride ?? wordCount.ideal

  const sections: string[] = []

  // ── Section 1: Role & MENA context ─────────────────────────────────────────
  sections.push(MENA_ECONOMIC_CONTEXT)

  sections.push('') // blank line separator

  // ── Section 2: Article type identity ────────────────────────────────────────
  sections.push('## هوية المقال ونمطه التحريري')
  sections.push(`نوع المقال: ${config.arabicLabel} (${config.arabicName})`)
  sections.push(`البنية المطلوبة: ${config.structure}`)
  sections.push(`الأسلوب والنبرة: ${config.tone}`)

  sections.push('') // blank line separator

  // ── Section 3: Word count targets ───────────────────────────────────────────
  sections.push('## متطلبات الطول')
  sections.push(
    `عدد الكلمات المستهدف: ${wordCount.min}–${wordCount.max} كلمة (مثالي: ${idealWords} كلمة)`
  )
  if (wordCountOverride !== undefined) {
    sections.push(`ملاحظة: عدد الكلمات المثالي تم تعديله خصيصاً لهذه المهمة (${idealWords} كلمة)`)
  }

  sections.push('') // blank line separator

  // ── Section 4: Style directives ─────────────────────────────────────────────
  sections.push('## توجيهات الأسلوب والتحرير')
  sections.push(buildDirectivesList(config.promptDirectives))

  sections.push('') // blank line separator

  // ── Section 5: Outline ──────────────────────────────────────────────────────
  sections.push('## الهيكل المقترح للمقال')
  sections.push(buildOutlineList(config.outlineTemplate))

  sections.push('') // blank line separator

  // ── Section 6: Glossary sample ──────────────────────────────────────────────
  sections.push('## مصطلحات مالية للاستخدام الصحيح')
  sections.push(
    'استخدم المصطلحات العربية التالية (وليس مقابلاتها الإنجليزية أو المعرّبة) في متن المقال:'
  )
  sections.push(buildGlossaryFragment(20))

  sections.push('') // blank line separator

  // ── Section 7: Number formatting ────────────────────────────────────────────
  sections.push(NUMBER_FORMATTING_RULES)

  sections.push('') // blank line separator

  // ── Section 8: Citation conventions ────────────────────────────────────────
  sections.push(CITATION_CONVENTIONS)

  sections.push('') // blank line separator

  // ── Section 9: Prohibited phrases ──────────────────────────────────────────
  sections.push('## المحظورات اللغوية')
  sections.push(
    'لا تستخدم الكلمات والتعابير الإنجليزية المعرّبة التالية حين يتوفر البديل العربي الدقيق:'
  )
  sections.push(buildProhibitedPhrasesInline())

  // ── Section 10: Topic / keyword injection (optional) ───────────────────────
  if (topic || targetKeyword) {
    sections.push('') // blank line separator
    sections.push('## تفاصيل المهمة الحالية')

    if (topic) {
      sections.push(`موضوع المقال: ${topic}`)
    }
    if (targetKeyword) {
      sections.push(
        `الكلمة المفتاحية المستهدفة (لأغراض تحسين محركات البحث): ${targetKeyword}`
      )
      sections.push(
        'أدرج الكلمة المفتاحية بشكل طبيعي في العنوان والفقرة الأولى وبعض العناوين الفرعية دون إقحامها.'
      )
    }
  }

  return sections.join('\n')
}
