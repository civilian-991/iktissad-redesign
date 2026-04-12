'use client'

/**
 * AIBubbleMenu — TipTap BubbleMenu with inline AI actions.
 *
 * Appears when text is selected in the editor.
 * Actions: improve (حسّن), summarize (لخّص), translate (ترجم), fact-check (تحقق).
 * Streams results in a popover below the menu with Replace/Dismiss buttons.
 *
 * Stream format: plain text chunks via toTextStreamResponse().
 */

import { useState, useCallback, useRef } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/core'
import {
  Wand2,
  FileText,
  Languages,
  Check as CheckIcon,
  X,
  Loader2,
  Copy,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AIBubbleMenuProps {
  editor: Editor
  articleType?: string
  onActionStart?: () => void
  onActionResult?: (result: string, action: string) => void
}

type BubbleAction = 'improve' | 'summarize' | 'translate' | 'fact-check'

interface ActionState {
  loading: boolean
  result: string
  action: BubbleAction | null
  error: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ACTIONS: Array<{
  id: BubbleAction
  label: string
  icon: React.ElementType
  title: string
}> = [
  { id: 'improve',    label: 'حسّن',  icon: Wand2,      title: 'أعد صياغة النص المحدد'        },
  { id: 'summarize',  label: 'لخّص',  icon: FileText,   title: 'لخّص النص المحدد'             },
  { id: 'translate',  label: 'ترجم',  icon: Languages,  title: 'ترجم النص المحدد'              },
  { id: 'fact-check', label: 'تحقق',  icon: CheckIcon,  title: 'تحقق من الأرقام والإحصاءات'   },
]

// ─────────────────────────────────────────────────────────────────────────────
// Plain-text streaming helper
// ─────────────────────────────────────────────────────────────────────────────

async function streamAction(
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
// ResultPopover
// ─────────────────────────────────────────────────────────────────────────────

function ResultPopover({
  state,
  onReplace,
  onDismiss,
  onCopy,
  copied,
}: {
  state: ActionState
  onReplace: () => void
  onDismiss: () => void
  onCopy: () => void
  copied: boolean
}) {
  if (!state.loading && !state.result && !state.error) return null

  return (
    <div
      dir="rtl"
      className="absolute top-full mt-2 start-0 z-50 w-80 rounded-xl border border-zinc-700 bg-zinc-800 shadow-2xl shadow-black/50 overflow-hidden"
    >
      {/* Result area */}
      <div className="p-3 max-h-48 overflow-y-auto text-xs text-white/85 leading-relaxed whitespace-pre-wrap">
        {state.loading && !state.result && (
          <span className="text-white/40 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin shrink-0" />
            يعمل الذكاء الاصطناعي...
          </span>
        )}
        {state.error && (
          <span className="text-red-400">{state.error}</span>
        )}
        {state.result && (
          <>
            {state.result}
            {state.loading && (
              <span className="inline-block w-0.5 h-3 bg-amber-400 animate-pulse me-0.5 align-middle" />
            )}
          </>
        )}
      </div>

      {/* Action buttons — shown when streaming is complete */}
      {!state.loading && state.result && (
        <div className="flex items-center gap-1.5 px-3 pb-3 pt-1 border-t border-zinc-700/60">
          <button
            onClick={onReplace}
            className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-900 text-xs font-semibold transition-colors"
          >
            استبدال
          </button>
          <button
            onClick={onCopy}
            className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white/70 hover:text-white transition-colors"
            title="نسخ"
          >
            {copied
              ? <CheckIcon size={12} className="text-green-400" />
              : <Copy size={12} />
            }
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white/70 hover:text-white transition-colors"
            title="إلغاء"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Dismiss while loading */}
      {state.loading && (
        <div className="flex justify-end px-3 pb-2">
          <button
            onClick={onDismiss}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            إلغاء
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AIBubbleMenu
// ─────────────────────────────────────────────────────────────────────────────

export default function AIBubbleMenu({
  editor,
  articleType,
  onActionStart,
  onActionResult,
}: AIBubbleMenuProps) {
  const [actionState, setActionState] = useState<ActionState>({
    loading: false,
    result: '',
    action: null,
    error: null,
  })
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const handleAction = useCallback(
    async (action: BubbleAction) => {
      // Cancel any in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const { from, to } = editor.state.selection
      const selection = editor.state.doc.textBetween(from, to, ' ')
      const content = editor.getText()

      if (!selection.trim()) return

      setActionState({ loading: true, result: '', action, error: null })
      setCopied(false)
      onActionStart?.()

      // Detect translate direction from script: Arabic chars → translate to en
      const hasArabic = /[\u0600-\u06FF]/.test(selection)
      const translateTo = action === 'translate' ? (hasArabic ? 'en' : 'ar') : undefined

      const params: Record<string, unknown> = {
        action,
        content,
        selection,
        articleType,
      }
      if (translateTo) params.translateTo = translateTo

      try {
        let accumulated = ''
        await streamAction(
          params,
          (chunk) => {
            accumulated += chunk
            setActionState((prev) => ({ ...prev, result: accumulated }))
          },
          controller.signal
        )
        onActionResult?.(accumulated, action)
        setActionState((prev) => ({ ...prev, loading: false }))
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع'
        setActionState({ loading: false, result: '', action, error: `خطأ: ${message}` })
      }
    },
    [editor, articleType, onActionStart, onActionResult]
  )

  const handleReplace = useCallback(() => {
    if (!actionState.result) return
    editor.chain().focus().insertContent(actionState.result).run()
    setActionState({ loading: false, result: '', action: null, error: null })
  }, [editor, actionState.result])

  const handleDismiss = useCallback(() => {
    abortRef.current?.abort()
    setActionState({ loading: false, result: '', action: null, error: null })
  }, [])

  const handleCopy = useCallback(async () => {
    if (!actionState.result) return
    try {
      await navigator.clipboard.writeText(actionState.result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available in this context
    }
  }, [actionState.result])

  const showPopover =
    actionState.loading || !!actionState.result || !!actionState.error

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ from, to }) => from !== to}
    >
      <div className="relative" dir="rtl">
        {/* Bubble action bar */}
        <div className="flex items-center gap-0.5 rounded-xl border border-zinc-700 bg-zinc-800/95 backdrop-blur-sm px-1 py-1 shadow-xl shadow-black/40">
          {/* AI label */}
          <span className="px-2 text-xs text-amber-400 font-semibold flex items-center gap-1 select-none">
            <Wand2 size={11} />
            ذكاء
          </span>
          <div className="w-px h-5 bg-zinc-700 mx-0.5" />

          {/* Action buttons */}
          {ACTIONS.map(({ id, label, icon: Icon, title }) => {
            const isActive = actionState.action === id && actionState.loading
            return (
              <button
                key={id}
                onClick={() => handleAction(id)}
                disabled={actionState.loading}
                title={title}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-white/70 hover:text-white hover:bg-zinc-700'
                }`}
              >
                {isActive
                  ? <Loader2 size={11} className="animate-spin" />
                  : <Icon size={11} />
                }
                {label}
              </button>
            )
          })}
        </div>

        {/* Result popover */}
        {showPopover && (
          <ResultPopover
            state={actionState}
            onReplace={handleReplace}
            onDismiss={handleDismiss}
            onCopy={handleCopy}
            copied={copied}
          />
        )}
      </div>
    </BubbleMenu>
  )
}
