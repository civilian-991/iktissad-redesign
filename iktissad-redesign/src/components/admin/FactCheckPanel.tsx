'use client';

import { useState } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { FactCheckClaim } from '@/app/api/ai/fact-check/route';

interface FactCheckPanelProps {
  articleId: string;
  content: string;
  title: string;
}

const PRIORITY_STYLES: Record<FactCheckClaim['priority'], { bg: string; text: string; label: string }> = {
  high:   { bg: 'bg-loss/10 border-loss/30',   text: 'text-loss',   label: 'عالية' },
  medium: { bg: 'bg-gold/10 border-gold/30',   text: 'text-gold',   label: 'متوسطة' },
  low:    { bg: 'bg-white/5 border-white/10',  text: 'text-white/50', label: 'منخفضة' },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? 'bg-profit' : value >= 0.4 ? 'bg-gold' : 'bg-loss';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-white/40 text-[10px] tabular-nums w-7 text-end">{pct}%</span>
    </div>
  );
}

export default function FactCheckPanel({ articleId: _articleId, content, title }: FactCheckPanelProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [claims, setClaims] = useState<FactCheckClaim[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleCheck = async () => {
    if (!content.trim()) {
      toast.error('أضف محتوى المقال أولاً');
      return;
    }
    setIsChecking(true);
    try {
      const res = await fetch('/api/ai/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحقق');
      setClaims(data.data.claims);
      setCheckedAt(data.data.checkedAt);
      toast.success(`تم تحليل المقال — ${data.data.claims.length} ادعاء قابل للتحقق`);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التحقق');
    } finally {
      setIsChecking(false);
    }
  };

  const highCount = claims?.filter((c) => c.priority === 'high').length ?? 0;

  return (
    <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
            <ShieldCheck size={16} className="text-ink" />
          </div>
          <div>
            <p className="text-white text-sm font-[family-name:var(--font-display)] font-semibold">
              مساعد التحقق من الوقائع
            </p>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
              استشاري فقط — يتطلب مراجعة بشرية
            </p>
          </div>
        </div>
        {claims !== null && (
          <span className="text-xs text-white/30 font-[family-name:var(--font-display)]">
            {new Date(checkedAt!).toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Summary badges */}
      {claims !== null && (
        <div className="flex items-center gap-2 mb-4">
          {highCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-loss/10 border border-loss/30 rounded-lg text-loss text-xs font-[family-name:var(--font-display)]">
              <AlertTriangle size={11} />
              {highCount} أولوية عالية
            </span>
          )}
          <span className="flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white/50 text-xs font-[family-name:var(--font-display)]">
            {claims.length} ادعاء
          </span>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={handleCheck}
        disabled={isChecking}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal/10 border border-teal/20 rounded-xl text-ink text-sm font-[family-name:var(--font-display)] hover:bg-teal/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {isChecking ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            جارٍ تحليل الوقائع…
          </>
        ) : (
          <>
            <ShieldCheck size={15} />
            {claims !== null ? 'إعادة التحقق' : 'فحص الوقائع'}
          </>
        )}
      </button>

      {/* No claims */}
      {claims !== null && claims.length === 0 && (
        <div className="flex items-center gap-2 p-3 bg-profit/10 border border-profit/20 rounded-xl">
          <ShieldCheck size={16} className="text-profit" />
          <p className="text-profit text-sm font-[family-name:var(--font-display)]">
            لم يُرصد ادعاءات تستدعي التحقق
          </p>
        </div>
      )}

      {/* Claims list */}
      {claims !== null && claims.length > 0 && (
        <div className="space-y-2">
          {claims.map((claim, idx) => {
            const style = PRIORITY_STYLES[claim.priority];
            const isOpen = expandedIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border ${style.bg} overflow-hidden`}
              >
                {/* Claim header */}
                <button
                  onClick={() => setExpandedIdx(isOpen ? null : idx)}
                  className="w-full flex items-start gap-3 p-3 text-start"
                >
                  <AlertCircle size={14} className={`${style.text} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-xs font-[family-name:var(--font-display)] leading-snug line-clamp-2">
                      {claim.claim}
                    </p>
                    <div className="mt-1.5">
                      <ConfidenceBar value={claim.confidence} />
                    </div>
                  </div>
                  <span className={`text-[10px] ${style.text} font-[family-name:var(--font-display)] whitespace-nowrap`}>
                    {style.label}
                  </span>
                  {isOpen
                    ? <ChevronUp size={12} className="text-white/30 flex-shrink-0 mt-0.5" />
                    : <ChevronDown size={12} className="text-white/30 flex-shrink-0 mt-0.5" />
                  }
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2">
                    {claim.note && (
                      <p className="text-white/50 text-xs font-[family-name:var(--font-display)] leading-relaxed">
                        {claim.note}
                      </p>
                    )}
                    {claim.suggestedSources.length > 0 && (
                      <div>
                        <p className="text-white/30 text-[10px] font-[family-name:var(--font-display)] mb-1">
                          مصادر مقترحة للتحقق:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {claim.suggestedSources.map((src) => (
                            <span
                              key={src}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-md text-white/50 text-[11px] font-[family-name:var(--font-display)]"
                            >
                              <ExternalLink size={9} />
                              {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-3 text-white/20 text-[10px] font-[family-name:var(--font-display)] text-center">
        هذا التحليل استشاري فقط ولا يُغني عن التحقق البشري
      </p>
    </div>
  );
}
