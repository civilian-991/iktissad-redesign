'use client'

/**
 * AIContentAgent — Arabic AI Research + Draft Agent Chat Interface
 *
 * Full chat UI for the autonomous IKTISSAD content agent.
 * The agent searches the internal article archive and drafts
 * structured Arabic financial articles with metadata.
 *
 * Features:
 *  - Streaming chat bubbles (plain-text stream from /api/ai/agent)
 *  - Quick-suggestion chips
 *  - Structured draft detection → "فتح في المحرر" button
 *  - RTL layout, zinc/slate dark palette
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  Bot,
  Send,
  Loader2,
  User,
  Sparkles,
  FileText,
  Copy,
  Check,
  RotateCcw,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { iconSizes } from '@/lib/design-tokens'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  draft?: ParsedDraft | null
  timestamp: Date
}

interface ParsedDraft {
  title: string
  content: string
  excerpt: string
  type: string
  tags: string[]
  metaDescription: string
  socialPost: { twitter: string; linkedin: string }
  internalLinks: Array<{ title: string; id?: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick suggestions
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  'اكتب موجزاً عن أسواق الخليج اليوم',
  'حلل أداء أسهم أرامكو في الربع الأول 2026',
  'ضع مسودة عن نمو الناتج المحلي غير النفطي في السعودية',
  'اكتب تقريراً عن صندوق الاستثمارات العامة وآخر صفقاته',
  'حلل تأثير قرارات أوبك بلاس على أسعار النفط',
]

// ─────────────────────────────────────────────────────────────────────────────
// Draft parser
// ─────────────────────────────────────────────────────────────────────────────

function parseDraft(text: string): ParsedDraft | null {
  // Check if response contains the structured draft markers
  if (
    !text.includes('[ARTICLE_DRAFT_START]') ||
    !text.includes('[ARTICLE_META_START]')
  ) {
    return null
  }

  try {
    // Extract JSON metadata block
    const metaMatch = text.match(
      /\[ARTICLE_META_START\][\s\S]*?```json\s*([\s\S]*?)\s*```[\s\S]*?\[ARTICLE_META_END\]/
    )
    if (!metaMatch) return null

    const meta = JSON.parse(metaMatch[1]) as {
      title?: string
      excerpt?: string
      metaDescription?: string
      type?: string
      tags?: string[]
      socialPost?: { twitter?: string; linkedin?: string }
      internalLinks?: Array<{ title: string; id?: string }>
    }

    // Extract article body between draft markers
    const draftMatch = text.match(
      /\[ARTICLE_DRAFT_START\]([\s\S]*?)\[ARTICLE_DRAFT_END\]/
    )
    const draftBody = draftMatch ? draftMatch[1].trim() : ''

    return {
      title: meta.title ?? '',
      content: draftBody,
      excerpt: meta.excerpt ?? '',
      type: meta.type ?? 'news',
      tags: meta.tags ?? [],
      metaDescription: meta.metaDescription ?? '',
      socialPost: {
        twitter: meta.socialPost?.twitter ?? '',
        linkedin: meta.socialPost?.linkedin ?? '',
      },
      internalLinks: meta.internalLinks ?? [],
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Strip draft markers for clean display
// ─────────────────────────────────────────────────────────────────────────────

function cleanMessageText(text: string): string {
  return text
    .replace(/\[ARTICLE_META_START\][\s\S]*?\[ARTICLE_META_END\]/g, '')
    .replace(/```json[\s\S]*?```/g, '')
    .trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// CopyButton
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('فشل النسخ')
    }
  }, [text])

  return (
    <button
      onClick={handleCopy}
      title="نسخ"
      className="p-1.5 rounded-lg bg-zinc-700/60 hover:bg-zinc-600 text-white/40 hover:text-white/80 transition-colors"
    >
      {copied ? (
        <Check size={iconSizes.xs} className="text-green-400" />
      ) : (
        <Copy size={iconSizes.xs} />
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DraftCard — shown when agent produces a structured draft
// ─────────────────────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  onOpenInEditor,
}: {
  draft: ParsedDraft
  onOpenInEditor: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-amber-500/15 bg-amber-500/10">
        <FileText size={iconSizes.xs} className="text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-300 flex-1 truncate">
          {draft.title || 'مسودة مقال'}
        </span>
      </div>

      {/* Excerpt preview */}
      {draft.excerpt && (
        <div className="px-3.5 py-2.5 border-b border-amber-500/10">
          <p className="text-xs text-white/60 leading-relaxed line-clamp-3">
            {draft.excerpt}
          </p>
        </div>
      )}

      {/* Metadata chips */}
      <div className="px-3.5 py-2 flex flex-wrap gap-1.5 border-b border-amber-500/10">
        {draft.type && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-700/60 text-white/50 border border-zinc-600/40">
            {draft.type}
          </span>
        )}
        {draft.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full text-xs bg-zinc-700/60 text-white/50 border border-zinc-600/40"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Internal links */}
      {draft.internalLinks.length > 0 && (
        <div className="px-3.5 py-2.5 border-b border-amber-500/10">
          <p className="text-xs text-white/35 mb-1.5">روابط داخلية مقترحة:</p>
          <ul className="space-y-1">
            {draft.internalLinks.slice(0, 3).map((link, i) => (
              <li key={i} className="flex items-center gap-1.5 text-xs text-white/50">
                <ChevronRight size={10} className="text-amber-400/50 shrink-0" />
                <span className="line-clamp-1">{link.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Open in editor button */}
      <div className="px-3.5 py-2.5">
        <button
          onClick={onOpenInEditor}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-900 text-xs font-bold transition-colors"
        >
          <FileText size={iconSizes.xs} />
          فتح في المحرر
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MessageBubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onOpenInEditor,
  isStreaming,
}: {
  message: Message
  onOpenInEditor: (draft: ParsedDraft) => void
  isStreaming: boolean
}) {
  const isUser = message.role === 'user'
  const displayText = isUser
    ? message.content
    : cleanMessageText(message.content)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
          isUser
            ? 'bg-zinc-600 text-white/70'
            : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
        }`}
      >
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      {/* Bubble */}
      <div className={`flex-1 min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`relative group max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-zinc-700 text-white/90 rounded-tr-sm self-end'
              : 'bg-zinc-800/80 border border-zinc-700/60 text-white/85 rounded-tl-sm self-start'
          }`}
        >
          {/* Text content */}
          <p className="whitespace-pre-wrap break-words">{displayText}</p>

          {/* Streaming cursor */}
          {isStreaming && !isUser && (
            <span className="inline-block w-0.5 h-3.5 bg-amber-400 animate-pulse ms-0.5 align-middle rounded-full" />
          )}

          {/* Copy button for assistant messages */}
          {!isUser && !isStreaming && displayText && (
            <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton text={displayText} />
            </div>
          )}
        </div>

        {/* Draft card */}
        {!isUser && message.draft && !isStreaming && (
          <div className="self-start w-full max-w-[85%]">
            <DraftCard
              draft={message.draft}
              onOpenInEditor={() => onOpenInEditor(message.draft!)}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TypingIndicator — shown while agent is thinking before first token
// ─────────────────────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="flex items-center gap-3"
    >
      <div className="shrink-0 w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
        <Bot size={13} className="text-amber-400" />
      </div>
      <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-zinc-800/80 border border-zinc-700/60">
        <Loader2 size={12} className="text-amber-400 animate-spin" />
        <span className="text-xs text-white/40">الوكيل يبحث ويفكر…</span>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AIContentAgent() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // ── Open draft in editor ───────────────────────────────────────────────────
  const handleOpenInEditor = useCallback(
    (draft: ParsedDraft) => {
      const draftPayload = {
        title: draft.title,
        content: draft.content,
        excerpt: draft.excerpt,
        type: draft.type,
        tags: draft.tags,
        metaDescription: draft.metaDescription,
      }
      router.push(
        `/admin/articles/new?draft=${encodeURIComponent(JSON.stringify(draftPayload))}`
      )
    },
    [router]
  )

  // ── Reset conversation ────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setInput('')
    setIsLoading(false)
    setStreamingId(null)
    inputRef.current?.focus()
  }, [])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (messageText: string) => {
      const text = messageText.trim()
      if (!text || isLoading) return

      // Build user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      }

      // Build conversation history for API (exclude current message)
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsLoading(true)

      // Placeholder assistant message (streaming target)
      const assistantId = crypto.randomUUID()
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        draft: null,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setStreamingId(assistantId)

      // Abort any in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch('/api/ai/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationHistory,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(errText || `HTTP ${response.status}`)
        }

        if (!response.body) throw new Error('No response body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          accumulated += chunk

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          )
        }

        // Parse draft from completed response
        const draft = parseDraft(accumulated)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated, draft } : m
          )
        )
      } catch (err) {
        if ((err as Error).name === 'AbortError') return

        const errMsg =
          err instanceof Error ? err.message : 'حدث خطأ غير متوقع'
        toast.error(`فشل الوكيل: ${errMsg}`)

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `⚠️ حدث خطأ أثناء معالجة طلبك: ${errMsg}`,
                  draft: null,
                }
              : m
          )
        )
      } finally {
        setIsLoading(false)
        setStreamingId(null)
        inputRef.current?.focus()
      }
    },
    [isLoading, messages]
  )

  // ── Handle textarea key events ────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend(input)
      }
    },
    [handleSend, input]
  )

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value)
      // Auto-resize
      const el = e.target
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`
    },
    []
  )

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full" dir="rtl">

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isEmpty && (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center gap-6 px-6 pb-4"
          >
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Sparkles size={iconSizes.xl} className="text-amber-400" />
            </div>

            {/* Copy */}
            <div className="text-center max-w-sm">
              <h2 className="text-lg font-bold text-white mb-2 font-[family-name:var(--font-display)]">
                وكيل المحتوى العربي
              </h2>
              <p className="text-sm text-white/40 leading-relaxed font-[family-name:var(--font-display)]">
                يبحث في الأرشيف ويُسوّد مقالاتك بأسلوب صحفي مالي احترافي.
                اكتب موضوعك أو اختر أحد المقترحات.
              </p>
            </div>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="px-3 py-1.5 rounded-full text-xs bg-zinc-800 border border-zinc-700 text-white/60 hover:text-white hover:border-amber-500/40 hover:bg-zinc-700/80 transition-all font-[family-name:var(--font-display)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages list ───────────────────────────────────────────────── */}
      {!isEmpty && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onOpenInEditor={handleOpenInEditor}
              isStreaming={streamingId === message.id}
            />
          ))}

          {/* Typing indicator: only before first token arrives */}
          <AnimatePresence>
            {isLoading && streamingId !== null && (
              (() => {
                const streamingMsg = messages.find((m) => m.id === streamingId)
                return streamingMsg && streamingMsg.content === '' ? (
                  <TypingIndicator key="typing" />
                ) : null
              })()
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-zinc-700/60 bg-zinc-900/80 px-4 py-3">
        {/* Quick suggestions (compact, shown when there are messages) */}
        {!isEmpty && (
          <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_SUGGESTIONS.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSend(suggestion)}
                disabled={isLoading}
                className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-zinc-800 border border-zinc-700 text-white/40 hover:text-white/70 hover:border-zinc-600 transition-colors disabled:opacity-40 font-[family-name:var(--font-display)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          {/* Reset button */}
          {!isEmpty && (
            <button
              onClick={handleReset}
              disabled={isLoading}
              title="محادثة جديدة"
              className="shrink-0 p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white/40 hover:text-white/70 hover:border-zinc-600 transition-colors disabled:opacity-40"
            >
              <RotateCcw size={iconSizes.sm} />
            </button>
          )}

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="اكتب طلبك للوكيل… (مثال: اكتب تقريراً عن أداء البنوك السعودية)"
              rows={1}
              disabled={isLoading}
              className="w-full resize-none rounded-xl bg-zinc-800 border border-zinc-700 text-white/90 placeholder-white/25 text-sm px-3.5 py-2.5 pr-3.5 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors disabled:opacity-50 font-[family-name:var(--font-display)] leading-relaxed"
              style={{ minHeight: '42px', maxHeight: '140px' }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={() => handleSend(input)}
            disabled={isLoading || !input.trim()}
            className="shrink-0 p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-white/20 text-zinc-900 transition-colors flex items-center justify-center"
            title="إرسال"
          >
            {isLoading ? (
              <Loader2 size={iconSizes.sm} className="animate-spin text-zinc-900/70" />
            ) : (
              <Send size={iconSizes.sm} />
            )}
          </button>
        </div>

        {/* Hint */}
        <p className="mt-1.5 text-xs text-white/20 text-center font-[family-name:var(--font-display)]">
          Enter للإرسال · Shift+Enter لسطر جديد · يعمل بالذكاء الاصطناعي Claude
        </p>
      </div>
    </div>
  )
}
