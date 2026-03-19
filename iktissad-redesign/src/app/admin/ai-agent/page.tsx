'use client'

import { Bot, Sparkles } from 'lucide-react'
import AIContentAgent from '@/components/admin/AIContentAgent'
import { iconSizes } from '@/lib/design-tokens'

export default function AIAgentPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Bot size={iconSizes.md} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-white font-semibold text-base font-[family-name:var(--font-display)]">
            وكيل المحتوى العربي
          </h1>
          <p className="text-zinc-500 text-xs font-[family-name:var(--font-display)]">
            مساعد ذكي للبحث والكتابة والتحليل المالي
          </p>
        </div>
        <div className="mr-auto flex items-center gap-2">
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-full">
            <Sparkles size={10} />
            Phase 9.2
          </span>
        </div>
      </div>

      {/* Chat area - full height */}
      <div className="flex-1 overflow-hidden bg-zinc-950">
        <AIContentAgent />
      </div>
    </div>
  )
}
