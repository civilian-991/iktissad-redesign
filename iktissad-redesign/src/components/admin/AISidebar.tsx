'use client'

/**
 * AISidebar — Collapsible AI assistant panel for document-level actions.
 *
 * Docked to the right of the editor. When collapsed shows a narrow tab (48px)
 * with a Sparkles icon. When open, expands to w-72 with action cards.
 *
 * Document-level actions:
 *  - أكمل الكتابة  (continue)   — appends next paragraph at end of document
 *  - اقترح عناوين (headlines)   — shows 5 headlines; each clickable to copy
 *  - اقتبس        (excerpt)     — shows generated excerpt with copy button
 *  - ترجم المقال  (translate)   — translates full article (ar ↔ en toggle)
 */

import { useState, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/core'
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Loader2,
  X,
  Languages,
  FileText,
  Wand2,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AISidebarProps {
  editor: Editor | null
  articleType?: string
  isOpen: boolean
  onToggle: () => void
}

type SidebarAction = 'continue' | 'headlines' | 'excerpt' | 'translate'
type TranslateLang = 'ar' | 'en'

interface CardState {
  loading: boolean
  result: string
  error: string | null
  headlines: string[] | null
}

const EMPTY_CARD_STATE: CardState = {
  loading: false,
  result: '',
  error: null,
  headlines: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming helper
// ─────────────────────────────────────────────────────────────────────────────

async function runStreamAction(
  params: Record<string, unknown>,
  onChunk: (text: string) => void,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch('/api/ai/stream-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(errText || `HTTP ${response.status}`)
  }

  if (!response.body) throw new Error('No response body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (chunk) onChunk(chunk)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CopyButton — small stateful copy icon button
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }, [text])

  return (
    <button
      onClick={handleCopy}
      title="نسخ"
      className={`p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white/60 hover:text-white transition-colors ${className}`}
    >
      {copied ? (
        <Check size={13} className="text-green-400" />
      ) : (
        <Copy size={13} />
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultArea — scrollable text + insert button
// ─────────────────────────────────────────────────────────────────────────────

function ResultArea({
  state,
  onInsert,
  onClear,
}: {
  state: CardState
  onInsert: () => void
  onClear: () => void
}) {
  if (!state.loading && !state.result && !state.error && !state.headlines) {
    return null
  }

  return (
    <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-950/50 overflow-hidden">
      {/* Text / loading area */}
      <div
        className={`p-2.5 max-h-40 overflow-y-auto text-xs text-white/80 leading-relaxed whitespace-pre-wrap ${
          state.loading ? 'animate-pulse' : ''
        }`}
      >
        {state.loading && !state.result && !state.headlines && (
          <span className="text-white/40 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin shrink-0 text-amber-400" />
            يعمل الذكاء الاصطناعي...
          </span>
        )}
        {state.error && <span className="text-red-400">{state.error}</span>}
        {state.result && (
          <>
            {state.result}
            {state.loading && (
              <span className="inline-block w-0.5 h-3 bg-amber-400 animate-pulse mr-0.5 align-middle" />
            )}
          </>
        )}
      </div>

      {/* Action buttons for text results */}
      {!state.loading && state.result && (
        <div className="flex items-center gap-1.5 p-2 border-t border-zinc-700/60">
          <button
            onClick={onInsert}
            className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-900 text-xs font-semibold transition-colors"
          >
            إدراج في المحرر
          </button>
          <CopyButton text={state.result} />
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white/60 hover:text-white transition-colors"
            title="مسح"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HeadlinesList — clickable list of 5 headlines
// ─────────────────────────────────────────────────────────────────────────────

function HeadlinesList({
  headlines,
  loading,
  onClear,
}: {
  headlines: string[]
  loading: boolean
  onClear: () => void
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const handleCopy = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch {
      // clipboard unavailable
    }
  }, [])

  if (headlines.length === 0 && !loading) return null

  return (
    <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-950/50 overflow-hidden">
      {loading && headlines.length === 0 ? (
        <div className="p-2.5 text-xs text-white/40 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin text-amber-400" />
          يعمل الذكاء الاصطناعي...
        </div>
      ) : (
        <ul className="divide-y divide-zinc-700/40">
          {headlines.map((headline, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 px-2.5 py-2 group hover:bg-zinc-800/60 transition-colors"
            >
              <span className="shrink-0 text-xs text-amber-400/60 font-mono mt-0.5">
                {idx + 1}
              </span>
              <span className="flex-1 text-xs text-white/85 leading-snug">{headline}</span>
              <button
                onClick={() => handleCopy(headline, idx)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-white/50 hover:text-white"
                title="نسخ العنوان"
              >
                {copiedIdx === idx ? (
                  <Check size={11} className="text-green-400" />
                ) : (
                  <Copy size={11} />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Clear button */}
      {!loading && headlines.length > 0 && (
        <div className="p-2 border-t border-zinc-700/60">
          <button
            onClick={onClear}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            مسح
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ActionCard — wrapper for each sidebar action
// ─────────────────────────────────────────────────────────────────────────────

function ActionCard({
  icon: Icon,
  label,
  description,
  loading,
  onRun,
  children,
}: {
  icon: React.ElementType
  label: string
  description: string
  loading: boolean
  onRun: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-3">
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Icon size={14} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-white">{label}</p>
              <p className="text-xs text-white/40 mt-0.5 leading-tight">{description}</p>
            </div>
            <button
              onClick={onRun}
              disabled={loading}
              className="shrink-0 px-2.5 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-xs text-white/80 hover:text-white font-medium transition-colors flex items-center gap-1"
            >
              {loading ? (
                <Loader2 size={11} className="animate-spin text-amber-400" />
              ) : null}
              تشغيل
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AISidebar
// ─────────────────────────────────────────────────────────────────────────────

export default function AISidebar({
  editor,
  articleType,
  isOpen,
  onToggle,
}: AISidebarProps) {
  // Per-action state
  const [states, setStates] = useState<Record<SidebarAction, CardState>>({
    continue:  { ...EMPTY_CARD_STATE },
    headlines: { ...EMPTY_CARD_STATE },
    excerpt:   { ...EMPTY_CARD_STATE },
    translate: { ...EMPTY_CARD_STATE },
  })

  // Translation language toggle (detect from content or let user toggle)
  const [translateTo, setTranslateTo] = useState<TranslateLang>('en')

  const abortRefs = useRef<Partial<Record<SidebarAction, AbortController>>>({})

  // ── Helpers ──────────────────────────────────────────────────────────────

  const setCardState = useCallback(
    (action: SidebarAction, patch: Partial<CardState>) => {
      setStates((prev) => ({
        ...prev,
        [action]: { ...prev[action], ...patch },
      }))
    },
    []
  )

  const clearCard = useCallback(
    (action: SidebarAction) => {
      abortRefs.current[action]?.abort()
      setStates((prev) => ({ ...prev, [action]: { ...EMPTY_CARD_STATE } }))
    },
    []
  )

  const getContent = useCallback((): string => {
    if (!editor) return ''
    return editor.getText()
  }, [editor])

  const insertAtEnd = useCallback(
    (text: string) => {
      if (!editor) return
      editor.commands.insertContentAt(editor.state.doc.content.size, `\n${text}`)
      editor.commands.focus()
    },
    [editor]
  )

  // ── Action runners ────────────────────────────────────────────────────────

  const runContinue = useCallback(async () => {
    if (!editor) return
    abortRefs.current.continue?.abort()
    const controller = new AbortController()
    abortRefs.current.continue = controller

    setCardState('continue', { loading: true, result: '', error: null, headlines: null })

    try {
      let accumulated = ''
      await runStreamAction(
        { action: 'continue', content: getContent(), articleType },
        (chunk) => {
          accumulated += chunk
          setCardState('continue', { result: accumulated })
        },
        controller.signal
      )
      setCardState('continue', { loading: false })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'حدث خطأ'
      setCardState('continue', { loading: false, error: `خطأ: ${message}` })
    }
  }, [editor, articleType, getContent, setCardState])

  const runHeadlines = useCallback(async () => {
    if (!editor) return
    abortRefs.current.headlines?.abort()
    const controller = new AbortController()
    abortRefs.current.headlines = controller

    setCardState('headlines', { loading: true, result: '', error: null, headlines: [] })

    try {
      const response = await fetch('/api/ai/stream-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'headlines', content: getContent(), articleType }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || `HTTP ${response.status}`)
      }

      const json = await response.json() as { headlines?: string[]; error?: string }
      if (json.error) throw new Error(json.error)
      setCardState('headlines', { loading: false, headlines: json.headlines ?? [] })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'حدث خطأ'
      setCardState('headlines', { loading: false, error: `خطأ: ${message}`, headlines: null })
    }
  }, [editor, articleType, getContent, setCardState])

  const runExcerpt = useCallback(async () => {
    if (!editor) return
    abortRefs.current.excerpt?.abort()
    const controller = new AbortController()
    abortRefs.current.excerpt = controller

    setCardState('excerpt', { loading: true, result: '', error: null, headlines: null })

    try {
      let accumulated = ''
      await runStreamAction(
        { action: 'excerpt', content: getContent(), articleType },
        (chunk) => {
          accumulated += chunk
          setCardState('excerpt', { result: accumulated })
        },
        controller.signal
      )
      setCardState('excerpt', { loading: false })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'حدث خطأ'
      setCardState('excerpt', { loading: false, error: `خطأ: ${message}` })
    }
  }, [editor, articleType, getContent, setCardState])

  const runTranslate = useCallback(async () => {
    if (!editor) return
    abortRefs.current.translate?.abort()
    const controller = new AbortController()
    abortRefs.current.translate = controller

    setCardState('translate', { loading: true, result: '', error: null, headlines: null })

    try {
      let accumulated = ''
      await runStreamAction(
        {
          action: 'translate',
          content: getContent(),
          selection: getContent(), // full article
          translateTo,
          articleType,
        },
        (chunk) => {
          accumulated += chunk
          setCardState('translate', { result: accumulated })
        },
        controller.signal
      )
      setCardState('translate', { loading: false })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'حدث خطأ'
      setCardState('translate', { loading: false, error: `خطأ: ${message}` })
    }
  }, [editor, translateTo, articleType, getContent, setCardState])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full" dir="rtl">
      {/* Collapsed tab */}
      {!isOpen && (
        <button
          onClick={onToggle}
          title="فتح المساعد الذكي"
          className="flex flex-col items-center justify-center w-12 gap-2 border-r border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-colors text-white/50 hover:text-amber-400 shrink-0"
          style={{ minHeight: 120 }}
        >
          <Sparkles size={16} className="text-amber-400" />
          <span
            className="text-xs font-semibold text-white/50"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            ذكاء
          </span>
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Open panel */}
      {isOpen && (
        <div className="flex flex-col w-72 shrink-0 border-r border-zinc-700 bg-zinc-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-700 bg-zinc-800/60 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-white tracking-wide">المساعد الذكي</span>
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-zinc-700 transition-colors"
              title="إغلاق"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Action cards */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">

            {/* Continue writing */}
            <ActionCard
              icon={Wand2}
              label="أكمل الكتابة"
              description="أضف فقرة تالية بنفس الأسلوب"
              loading={states.continue.loading}
              onRun={runContinue}
            >
              <ResultArea
                state={states.continue}
                onInsert={() => insertAtEnd(states.continue.result)}
                onClear={() => clearCard('continue')}
              />
            </ActionCard>

            {/* Headlines */}
            <ActionCard
              icon={FileText}
              label="اقترح عناوين"
              description="5 عناوين صحفية مرتبة من الأقوى"
              loading={states.headlines.loading}
              onRun={runHeadlines}
            >
              {(states.headlines.loading || (states.headlines.headlines !== null)) && (
                <HeadlinesList
                  headlines={states.headlines.headlines ?? []}
                  loading={states.headlines.loading}
                  onClear={() => clearCard('headlines')}
                />
              )}
              {states.headlines.error && (
                <p className="mt-1.5 text-xs text-red-400">{states.headlines.error}</p>
              )}
            </ActionCard>

            {/* Excerpt */}
            <ActionCard
              icon={FileText}
              label="اقتبس"
              description="مقدمة موجزة (150–200 كلمة)"
              loading={states.excerpt.loading}
              onRun={runExcerpt}
            >
              <ResultArea
                state={states.excerpt}
                onInsert={() => {
                  if (!editor) return
                  editor.commands.insertContent(states.excerpt.result)
                  editor.commands.focus()
                }}
                onClear={() => clearCard('excerpt')}
              />
            </ActionCard>

            {/* Translate */}
            <ActionCard
              icon={Languages}
              label="ترجم المقال"
              description={`ترجمة المقال كاملاً`}
              loading={states.translate.loading}
              onRun={runTranslate}
            >
              {/* Language toggle */}
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-xs text-white/40">إلى:</span>
                <button
                  onClick={() => setTranslateTo('en')}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                    translateTo === 'en'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-white/40 hover:text-white/70 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setTranslateTo('ar')}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                    translateTo === 'ar'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-white/40 hover:text-white/70 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  العربية
                </button>
              </div>

              <ResultArea
                state={states.translate}
                onInsert={() => insertAtEnd(states.translate.result)}
                onClear={() => clearCard('translate')}
              />
            </ActionCard>

          </div>

          {/* Footer note */}
          <div className="shrink-0 px-3 py-2 border-t border-zinc-700/60">
            <p className="text-xs text-white/20 text-center">
              يعمل بالذكاء الاصطناعي · Claude
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
