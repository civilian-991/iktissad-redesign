"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Search,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Info,
  Eye,
  Tag,
} from "lucide-react";
import type { SEOAnalysisResult, SEOIssue } from "@/app/api/ai/seo-analysis/route";
import SEOInternalLinks from "@/components/admin/SEOInternalLinks";
import SEOConversionSignal from "@/components/admin/SEOConversionSignal";
import SEOCompetitorGap from "@/components/admin/SEOCompetitorGap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SEOPanelProps {
  content: string;
  title: string;
  excerpt?: string;
  targetKeyword?: string;
  articleType?: string;
  sectionSlug?: string;
  currentArticleId?: string;
  onTargetKeywordChange?: (keyword: string) => void;
  onEntityClick?: (entity: string) => void;
}

// ---------------------------------------------------------------------------
// Debounce hook (inline, no external lib)
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ---------------------------------------------------------------------------
// Circular SVG score indicator
// ---------------------------------------------------------------------------

interface ScoreCircleProps {
  score: number;
}

function ScoreCircle({ score }: ScoreCircleProps) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  const gap = circumference - filled;

  let strokeColor: string;
  let textColor: string;
  if (score >= 70) {
    strokeColor = "#22c55e"; // green-500
    textColor = "text-green-400";
  } else if (score >= 40) {
    strokeColor = "#f59e0b"; // amber-500
    textColor = "text-amber-400";
  } else {
    strokeColor = "#ef4444"; // red-500
    textColor = "text-red-400";
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
      <svg width={88} height={88} viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
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
        <span className={`text-xl font-bold leading-none ${textColor}`}>{score}</span>
        <span className="text-[10px] text-zinc-500 mt-0.5">SEO</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overall score computation
//   Weights: errors = 0 points, warnings = 50 pts, passing = 100 pts
//   Score = average of signal scores
// ---------------------------------------------------------------------------

function computeOverallScore(result: SEOAnalysisResult): number {
  const errorCount = result.issues.filter((i) => i.severity === "error").length;
  const warningCount = result.issues.filter(
    (i) => i.severity === "warning"
  ).length;

  // Start at 100 and subtract: errors -15, warnings -8, info -2
  let score = 100 - errorCount * 15 - warningCount * 8;

  // Boost for readability
  score = score * 0.8 + result.readabilityScore * 0.2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ---------------------------------------------------------------------------
// Signal chip
// ---------------------------------------------------------------------------

type ChipStatus = "good" | "warn" | "error" | "neutral";

interface SignalChipProps {
  label: string;
  status: ChipStatus;
}

function SignalChip({ label, status }: SignalChipProps) {
  const colors: Record<ChipStatus, string> = {
    good: "bg-green-900/40 border-green-700 text-green-300",
    warn: "bg-amber-900/40 border-amber-700 text-amber-300",
    error: "bg-red-900/40 border-red-700 text-red-300",
    neutral: "bg-zinc-800 border-zinc-600 text-zinc-400",
  };

  return (
    <div
      className={`rounded-md border px-2 py-1 text-xs font-medium ${colors[status]}`}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue item
// ---------------------------------------------------------------------------

interface IssueItemProps {
  issue: SEOIssue;
}

function IssueItem({ issue }: IssueItemProps) {
  if (issue.severity === "error") {
    return (
      <li className="flex items-start gap-2 text-sm text-red-300">
        <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
        <span>{issue.message}</span>
      </li>
    );
  }
  if (issue.severity === "warning") {
    return (
      <li className="flex items-start gap-2 text-sm text-amber-300">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
        <span>{issue.message}</span>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-2 text-sm text-zinc-400">
      <Info size={14} className="mt-0.5 shrink-0 text-zinc-500" />
      <span>{issue.message}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Google snippet preview
// ---------------------------------------------------------------------------

interface SnippetPreviewProps {
  title: string;
  excerpt?: string;
}

function SnippetPreview({ title, excerpt }: SnippetPreviewProps) {
  const displayTitle =
    title.length > 65 ? title.slice(0, 62) + "..." : title || "عنوان المقال";
  const displayDesc =
    (excerpt ?? "").length > 160
      ? excerpt!.slice(0, 157) + "..."
      : excerpt || "أضف وصفاً تعريفياً ليظهر هنا في نتائج البحث.";

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-start" dir="rtl">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-2 flex items-center gap-1.5">
        <Eye size={12} />
        معاينة نتيجة البحث
      </p>
      <p className="text-[13px] font-medium text-blue-400 leading-snug truncate">
        {displayTitle}
      </p>
      <p className="text-[11px] text-green-500 mt-0.5 mb-1">
        iktissad.com › article-slug
      </p>
      <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-2">
        {displayDesc}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SEOPanel({
  content,
  title,
  excerpt,
  targetKeyword: targetKeywordProp = "",
  articleType,
  sectionSlug,
  currentArticleId,
  onTargetKeywordChange,
  onEntityClick,
}: SEOPanelProps) {
  const [localKeyword, setLocalKeyword] = useState(targetKeywordProp);
  const [result, setResult] = useState<SEOAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sync external keyword prop changes into local state
  useEffect(() => {
    setLocalKeyword(targetKeywordProp);
  }, [targetKeywordProp]);

  // Debounce all analysis triggers
  const debouncedContent = useDebounce(content, 1500);
  const debouncedTitle = useDebounce(title, 1500);
  const debouncedExcerpt = useDebounce(excerpt ?? "", 1500);
  const debouncedKeyword = useDebounce(localKeyword, 500);

  // Fire analysis whenever debounced inputs change
  const analyse = useCallback(async () => {
    if (!debouncedContent.trim() && !debouncedTitle.trim()) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch("/api/ai/seo-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: debouncedContent,
          title: debouncedTitle,
          excerpt: debouncedExcerpt || undefined,
          targetKeyword: debouncedKeyword || undefined,
          articleType,
          sectionSlug,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "خطأ غير معروف" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.data) {
        setResult(json.data as SEOAnalysisResult);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setFetchError(
        err instanceof Error ? err.message : "فشل تحليل SEO"
      );
    } finally {
      setLoading(false);
    }
  }, [
    debouncedContent,
    debouncedTitle,
    debouncedExcerpt,
    debouncedKeyword,
    articleType,
    sectionSlug,
  ]);

  useEffect(() => {
    void analyse();
  }, [analyse]);

  // Keyword input handler with debounce notification to parent
  function handleKeywordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const kw = e.target.value;
    setLocalKeyword(kw);
    onTargetKeywordChange?.(kw);
  }

  // Helper: get chip status for word count
  function wordCountStatus(_wc: number): ChipStatus {
    if (!result) return "neutral";
    const hasError = result.issues.some(
      (i) => i.severity === "error" && i.message.includes("عدد الكلمات")
    );
    const hasWarning = result.issues.some(
      (i) => i.severity === "warning" && i.message.includes("عدد الكلمات")
    );
    if (hasError) return "error";
    if (hasWarning) return "warn";
    return "good";
  }

  function issueChipStatus(
    checkFn: (issue: SEOIssue) => boolean
  ): ChipStatus {
    if (!result) return "neutral";
    const match = result.issues.find(checkFn);
    if (!match) return "good";
    return match.severity === "error" ? "error" : "warn";
  }

  const overallScore = result ? computeOverallScore(result) : 0;
  const isEmpty = !content.trim() && !title.trim();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-5 text-start"
      dir="rtl"
    >
      {/* Panel header */}
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-white">تحليل SEO</h3>
      </div>

      {/* Keyword input */}
      <div>
        <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1.5 block">
          الكلمة المفتاحية المستهدفة
        </label>
        <div className="relative">
          <input
            type="text"
            value={localKeyword}
            onChange={handleKeywordChange}
            placeholder="أدخل الكلمة المفتاحية…"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-600 text-sm text-white placeholder-zinc-500 ps-8 pe-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
          />
          <Search
            size={13}
            className="absolute start-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
          />
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && !loading && !result && (
        <p className="text-sm text-zinc-500 text-center py-4">
          ابدأ بكتابة المقال لرؤية تحليل SEO
        </p>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 justify-center py-2">
          <svg
            className="animate-spin h-4 w-4 text-amber-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span className="text-xs text-zinc-400">جاري التحليل…</span>
        </div>
      )}

      {/* Fetch error */}
      {fetchError && !loading && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-700 px-3 py-2">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-300">{fetchError}</p>
        </div>
      )}

      {/* Results — shown stale while re-fetching */}
      {result && (
        <>
          {/* Score overview */}
          <div className="flex items-center gap-4">
            <ScoreCircle score={overallScore} />
            <div>
              <p className="text-xs text-zinc-400 mb-0.5">النتيجة الإجمالية</p>
              <p className="text-base font-bold text-white">{overallScore}/100</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {overallScore >= 70
                  ? "ممتاز"
                  : overallScore >= 40
                  ? "يحتاج تحسيناً"
                  : "يحتاج مراجعة"}
              </p>
            </div>
          </div>

          {/* Signals grid */}
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">
              مؤشرات المحتوى
            </p>
            <div className="grid grid-cols-2 gap-2">
              <SignalChip
                label={`الكلمات: ${result.wordCount}`}
                status={wordCountStatus(result.wordCount)}
              />
              <SignalChip
                label={`${result.readabilityLabel} (${result.readabilityScore}/100)`}
                status={
                  result.readabilityScore >= 70
                    ? "good"
                    : result.readabilityScore >= 50
                    ? "warn"
                    : "error"
                }
              />
              {result.keywordDensity !== null && (
                <SignalChip
                  label={`الكثافة: ${result.keywordDensity}%`}
                  status={issueChipStatus((i) =>
                    i.message.includes("كثافة الكلمة")
                  )}
                />
              )}
              <SignalChip
                label={`العنوان: ${result.metaTitleLength} حرف`}
                status={issueChipStatus((i) =>
                  i.message.includes("العنوان (")
                )}
              />
              <SignalChip
                label={`الوصف: ${result.metaDescLength} حرف`}
                status={issueChipStatus((i) =>
                  i.message.includes("الوصف التعريفي")
                )}
              />
              <SignalChip
                label={`العناوين: ${result.headingCount.h2 + result.headingCount.h3}`}
                status={
                  result.headingCount.h1 > 1
                    ? "error"
                    : result.headingCount.h2 + result.headingCount.h3 > 0
                    ? "good"
                    : "neutral"
                }
              />
            </div>
          </div>

          {/* Issues list */}
          {result.issues.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">
                ملاحظات SEO
              </p>
              <ul className="space-y-2.5">
                {result.issues.map((issue, idx) => (
                  <IssueItem key={idx} issue={issue} />
                ))}
              </ul>
            </div>
          )}

          {result.issues.length === 0 && (
            <p className="text-xs text-green-400 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
              لا توجد مشكلات — محتوى ممتاز لمحركات البحث!
            </p>
          )}

          {/* Entities */}
          {result.entities.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Tag size={11} />
                الكيانات المكتشفة
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.entities.map((entity) => (
                  <button
                    key={entity}
                    type="button"
                    onClick={() => onEntityClick?.(entity)}
                    title="انقر لإضافته كوسم"
                    className="rounded-full border border-amber-700/60 bg-amber-900/20 px-2.5 py-0.5 text-xs text-amber-300 hover:bg-amber-800/40 hover:border-amber-500 transition-colors cursor-pointer"
                  >
                    {entity}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested tags */}
          {result.suggestedTags.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Tag size={11} />
                الوسوم المقترحة
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.suggestedTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-600 bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Google snippet preview */}
          <SnippetPreview title={title} excerpt={excerpt} />
        </>
      )}

      {/* ── Differentiated signals ─────────────────────────────────────── */}

      <SEOInternalLinks
        title={title}
        content={content}
        targetKeyword={localKeyword || undefined}
        currentArticleId={currentArticleId}
      />

      <SEOConversionSignal
        sectionSlug={sectionSlug}
        articleType={articleType}
      />

      {localKeyword.trim().length > 3 && (
        <SEOCompetitorGap
          title={title}
          content={content}
          targetKeyword={localKeyword}
          articleType={articleType}
        />
      )}
    </div>
  );
}
