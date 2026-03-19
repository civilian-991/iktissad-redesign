"use client";

/**
 * GEO Panel — Generative Engine Optimization
 * تحسين المحتوى لمحركات البحث بالذكاء الاصطناعي
 *
 * Analyzes Arabic financial articles for AI search readiness
 * (Perplexity, ChatGPT, Gemini) alongside traditional SEO.
 *
 * Design: matches SEOPanel dark zinc/slate style, Arabic RTL.
 */

import { useState, useCallback, useRef } from "react";
import {
  Globe,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Code2,
  ListChecks,
  Loader2,
  Info,
} from "lucide-react";
import type { GEOAnalysisResult } from "@/app/api/ai/geo-analysis/route";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface GEOPanelProps {
  articleId?: string;
  title: string;
  content: string; // plain text extracted from editor
  articleType?: string;
  keyword?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Score circle — matches SEOPanel ScoreCircle style
// ─────────────────────────────────────────────────────────────────────────────

function GEOScoreCircle({ score }: { score: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  const gap = circumference - filled;

  let strokeColor: string;
  let textColor: string;
  if (score >= 70) {
    strokeColor = "#22c55e";
    textColor = "text-green-400";
  } else if (score >= 40) {
    strokeColor = "#f59e0b";
    textColor = "text-amber-400";
  } else {
    strokeColor = "#ef4444";
    textColor = "text-red-400";
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 88, height: 88 }}
    >
      <svg
        width={88}
        height={88}
        viewBox="0 0 88 88"
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={44}
          cy={44}
          r={radius}
          fill="none"
          stroke="#3f3f46"
          strokeWidth={7}
        />
        {/* Progress */}
        <circle
          cx={44}
          cy={44}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={7}
          strokeDasharray={`${filled} ${gap}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold leading-none ${textColor}`}>
          {score}
        </span>
        <span className="text-[10px] text-zinc-500 mt-0.5">GEO</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Score label
// ─────────────────────────────────────────────────────────────────────────────

function scoreLabel(score: number): string {
  if (score >= 70) return "جاهز للذكاء الاصطناعي";
  if (score >= 40) return "يحتاج تحسيناً";
  return "يحتاج مراجعة شاملة";
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy button
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="نسخ"
      className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white text-xs transition-colors shrink-0"
    >
      {copied ? (
        <Check size={11} className="text-green-400" />
      ) : (
        <Copy size={11} />
      )}
      {copied ? "تم النسخ" : "نسخ"}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible section
// ─────────────────────────────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
  badge,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-800 hover:bg-zinc-750 transition-colors text-right"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wide">
          {icon}
          {title}
          {badge}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-zinc-500" />
        ) : (
          <ChevronDown size={14} className="text-zinc-500" />
        )}
      </button>
      {open && <div className="p-3 space-y-3 bg-zinc-900">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────

function GEOSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Score row */}
      <div className="flex items-center gap-4">
        <div className="w-[88px] h-[88px] rounded-full bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-zinc-800 rounded w-1/2" />
          <div className="h-5 bg-zinc-800 rounded w-1/3" />
          <div className="h-3 bg-zinc-800 rounded w-2/3" />
        </div>
      </div>
      {/* Section skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-zinc-700 overflow-hidden">
          <div className="h-9 bg-zinc-800" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-zinc-800 rounded" />
            <div className="h-3 bg-zinc-800 rounded w-5/6" />
            <div className="h-3 bg-zinc-800 rounded w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function GEOPanel({
  articleId,
  title,
  content,
  articleType,
  keyword,
}: GEOPanelProps) {
  const [result, setResult] = useState<GEOAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isEmpty = !content.trim() && !title.trim();

  const handleAnalyze = useCallback(async () => {
    if (isEmpty) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch("/api/ai/geo-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          title,
          content,
          articleType,
          keyword,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "خطأ غير معروف" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.data?.geoAnalysis) {
        setResult(json.data.geoAnalysis as GEOAnalysisResult);
      } else {
        throw new Error("استجابة غير متوقعة من الخادم");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setFetchError(err instanceof Error ? err.message : "فشل تحليل GEO");
    } finally {
      setLoading(false);
    }
  }, [articleId, title, content, articleType, keyword, isEmpty]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-5 text-right"
      dir="rtl"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-white">
            تحليل GEO
          </h3>
          <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5 leading-none">
            Generative Engine Optimization
          </span>
        </div>

        {/* Analyze button */}
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading || isEmpty}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {loading ? "جاري التحليل…" : "تحليل GEO"}
        </button>
      </div>

      {/* Info note — shown before first analysis */}
      {!result && !loading && !fetchError && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-950/40 border border-blue-800/40 px-3 py-2.5">
          <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300 leading-relaxed">
            يحلل هذا اللوح مدى جاهزية مقالك للظهور كمصدر مقتبَس في نتائج
            Perplexity وChatGPT وGemini. اضغط «تحليل GEO» للبدء.
          </p>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !loading && (
        <p className="text-sm text-zinc-500 text-center py-4">
          ابدأ بكتابة العنوان والمحتوى لتفعيل تحليل GEO
        </p>
      )}

      {/* Loading skeleton */}
      {loading && <GEOSkeleton />}

      {/* Fetch error */}
      {fetchError && !loading && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-700 px-3 py-2">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-300">{fetchError}</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Score overview */}
          <div className="flex items-center gap-4">
            <GEOScoreCircle score={result.readinessScore} />
            <div>
              <p className="text-xs text-zinc-400 mb-0.5">
                جاهزية محركات الذكاء الاصطناعي
              </p>
              <p className="text-base font-bold text-white">
                {result.readinessScore}/100
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {scoreLabel(result.readinessScore)}
              </p>
            </div>
          </div>

          {/* Direct Answer Paragraph */}
          <CollapsibleSection
            title="الإجابة المباشرة"
            icon={<MessageSquare size={13} className="text-blue-400" />}
            badge={
              result.directAnswerExists ? (
                <span className="mr-1 text-[10px] text-green-400 border border-green-700/50 rounded px-1.5 py-0.5 leading-none normal-case font-normal">
                  موجودة
                </span>
              ) : (
                <span className="mr-1 text-[10px] text-amber-400 border border-amber-700/50 rounded px-1.5 py-0.5 leading-none normal-case font-normal">
                  مقترحة
                </span>
              )
            }
            defaultOpen={true}
          >
            {/* Existence note */}
            {result.directAnswerExists ? (
              <p className="text-xs text-green-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                يحتوي المقال على إجابة مباشرة في بدايته — ممتاز لمحركات الذكاء
                الاصطناعي
              </p>
            ) : (
              <p className="text-xs text-amber-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                لا تتضمن بداية المقال إجابة مباشرة — أضف الفقرة المقترحة أدناه
              </p>
            )}

            {/* Suggested paragraph */}
            <div className="rounded-md bg-zinc-800 border border-zinc-700 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-zinc-200 leading-relaxed flex-1">
                  {result.directAnswerParagraph}
                </p>
                <CopyButton text={result.directAnswerParagraph} />
              </div>
            </div>
          </CollapsibleSection>

          {/* FAQ Suggestions */}
          <CollapsibleSection
            title="أسئلة متكررة مقترحة"
            icon={<ListChecks size={13} className="text-purple-400" />}
            badge={
              <span className="mr-1 text-[10px] text-zinc-400 border border-zinc-700 rounded px-1.5 py-0.5 leading-none normal-case font-normal">
                {result.faqSuggestions.length} أسئلة
              </span>
            }
            defaultOpen={true}
          >
            <p className="text-xs text-zinc-500">
              أضف هذه الأسئلة والأجوبة كقسم FAQ في نهاية المقال لتعزيز
              الاقتباس من محركات الذكاء الاصطناعي.
            </p>
            <div className="space-y-3">
              {result.faqSuggestions.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-md bg-zinc-800 border border-zinc-700 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white leading-relaxed flex-1">
                      س: {faq.question}
                    </p>
                    <CopyButton
                      text={`س: ${faq.question}\nج: ${faq.answer}`}
                    />
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    ج: {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Citation Formatting */}
          <CollapsibleSection
            title="جودة الاستشهاد بالمصادر"
            icon={<Info size={13} className="text-teal-400" />}
            defaultOpen={false}
            badge={
              <span
                className={`mr-1 text-[10px] border rounded px-1.5 py-0.5 leading-none normal-case font-normal ${
                  result.citationFormatting.score >= 70
                    ? "text-green-400 border-green-700/50"
                    : result.citationFormatting.score >= 40
                    ? "text-amber-400 border-amber-700/50"
                    : "text-red-400 border-red-700/50"
                }`}
              >
                {result.citationFormatting.score}/100
              </span>
            }
          >
            {result.citationFormatting.suggestions.length > 0 ? (
              <ul className="space-y-2">
                {result.citationFormatting.suggestions.map((s, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-zinc-400"
                  >
                    <span className="inline-block w-1 h-1 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-green-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                الاستشهاد بالمصادر ممتاز — لا اقتراحات إضافية
              </p>
            )}
          </CollapsibleSection>

          {/* Structured Data Recommendations */}
          <CollapsibleSection
            title="البيانات المنظمة (JSON-LD)"
            icon={<Code2 size={13} className="text-orange-400" />}
            defaultOpen={false}
          >
            <p className="text-xs text-zinc-500">
              أضف هذه الأنواع من Schema.org في صفحة المقال لتحسين فهم محركات
              الذكاء الاصطناعي لمحتواك.
            </p>
            <div className="space-y-3">
              {result.structuredDataRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="rounded-md bg-zinc-800 border border-zinc-700 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
                    <span className="text-xs font-mono font-semibold text-orange-300">
                      {rec.schemaType}
                    </span>
                    <CopyButton text={rec.snippet} />
                  </div>
                  <div className="px-3 py-2 space-y-2">
                    <p className="text-xs text-zinc-400">{rec.reason}</p>
                    <pre className="text-[11px] text-zinc-500 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                      {rec.snippet}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Improvement Suggestions */}
          <CollapsibleSection
            title="اقتراحات التحسين"
            icon={<Sparkles size={13} className="text-amber-400" />}
            defaultOpen={true}
          >
            <ol className="space-y-2.5">
              {result.improvements.map((improvement, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-sm text-zinc-300"
                >
                  <span className="shrink-0 w-5 h-5 rounded-full bg-amber-900/50 border border-amber-700/60 text-amber-400 text-[11px] font-bold flex items-center justify-center leading-none">
                    {idx + 1}
                  </span>
                  {improvement}
                </li>
              ))}
            </ol>
          </CollapsibleSection>

          {/* Re-analyze button at bottom */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-400 hover:text-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles size={12} />
            إعادة التحليل
          </button>
        </div>
      )}
    </div>
  );
}
