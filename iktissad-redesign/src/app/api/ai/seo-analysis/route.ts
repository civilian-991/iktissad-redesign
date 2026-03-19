import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const seoAnalysisSchema = z.object({
  content: z.string(),
  title: z.string(),
  excerpt: z.string().optional(),
  targetKeyword: z.string().optional(),
  articleType: z.string().optional(),
  sectionSlug: z.string().optional(),
});

type SeoAnalysisInput = z.infer<typeof seoAnalysisSchema>;

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface SEOIssue {
  severity: "error" | "warning" | "info";
  message: string;
}

export interface HeadingCount {
  h1: number;
  h2: number;
  h3: number;
}

export interface SEOAnalysisResult {
  wordCount: number;
  headingCount: HeadingCount;
  keywordDensity: number | null;
  keywordInTitle: boolean | null;
  keywordInFirstParagraph: boolean | null;
  readabilityScore: number;
  readabilityLabel: string;
  entities: string[];
  suggestedTags: string[];
  metaTitleLength: number;
  metaDescLength: number;
  issues: SEOIssue[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MENA_COUNTRIES = [
  "السعودية",
  "الإمارات",
  "قطر",
  "الكويت",
  "البحرين",
  "عُمان",
  "مصر",
  "الأردن",
  "المغرب",
  "تونس",
  "ليبيا",
  "الجزائر",
  "العراق",
  "لبنان",
  "اليمن",
  "السودان",
];

const ORG_SUFFIXES = [
  "شركة",
  "مجموعة",
  "بنك",
  "صندوق",
  "هيئة",
  "مؤسسة",
  "شركات",
  "مصرف",
  "منظمة",
  "اتحاد",
];

const PERSON_TITLES = [
  "وزير",
  "رئيس",
  "مدير",
  "محافظ",
  "نائب",
  "وزيرة",
  "رئيسة",
  "مديرة",
];

const FINANCIAL_INSTRUMENTS = [
  "أسهم",
  "سندات",
  "صكوك",
  "ذهب",
  "نفط",
  "عملة",
  "مؤشر",
  "عقارات",
  "سلع",
];

interface ArticleTypeLimits {
  min: number;
  max: number;
}

const WORD_COUNT_TARGETS: Record<string, ArticleTypeLimits> = {
  news: { min: 300, max: 500 },
  report: { min: 800, max: 1500 },
  analysis: { min: 1000, max: 2000 },
  interview: { min: 600, max: 1200 },
  opinion: { min: 500, max: 900 },
  default: { min: 400, max: 1200 },
};

// ---------------------------------------------------------------------------
// Arabic text utilities
// ---------------------------------------------------------------------------

/** Split Arabic text into words (filter empty tokens). */
function arabicWords(text: string): string[] {
  return text
    .trim()
    .split(/[\s\u200c\u200d\u00a0]+/)
    .filter((w) => w.length > 0);
}

/** Split Arabic text into sentences on . ، ! ? */
function arabicSentences(text: string): string[] {
  return text
    .split(/[.،!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Split text into paragraphs on blank lines or newlines. */
function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// ---------------------------------------------------------------------------
// Word count
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return arabicWords(text).length;
}

// ---------------------------------------------------------------------------
// Heading detection (plain text heuristics)
// ---------------------------------------------------------------------------

/**
 * Count H1/H2/H3 in plain text by detecting lines that look like Markdown
 * headings (# / ## / ###). TipTap serialises headings this way when exported
 * as plain text via getText().
 */
function countHeadings(text: string): HeadingCount {
  const lines = text.split(/\r?\n/);
  let h1 = 0;
  let h2 = 0;
  let h3 = 0;
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (/^###\s/.test(trimmed)) h3++;
    else if (/^##\s/.test(trimmed)) h2++;
    else if (/^#\s/.test(trimmed)) h1++;
  }
  return { h1, h2, h3 };
}

// ---------------------------------------------------------------------------
// Keyword analysis
// ---------------------------------------------------------------------------

function calcKeywordDensity(text: string, keyword: string): number {
  if (!keyword.trim()) return 0;
  const words = arabicWords(text);
  if (words.length === 0) return 0;
  const kw = keyword.trim().toLowerCase();
  const occurrences = words.filter((w) => w.toLowerCase().includes(kw)).length;
  return parseFloat(((occurrences / words.length) * 100).toFixed(2));
}

function keywordInFirstParagraph(text: string, keyword: string): boolean {
  const paras = paragraphs(text);
  if (paras.length === 0) return false;
  return paras[0].includes(keyword.trim());
}

// ---------------------------------------------------------------------------
// Arabic readability score
// ---------------------------------------------------------------------------

function calcReadability(
  text: string,
  headings: HeadingCount,
  wordCount: number
): { score: number; label: string } {
  const sentences = arabicSentences(text);
  if (sentences.length === 0) return { score: 60, label: "متوسط" };

  const totalWords = sentences.reduce(
    (sum, s) => sum + arabicWords(s).length,
    0
  );
  const avgSentenceLen = totalWords / sentences.length;

  let score: number;
  if (avgSentenceLen < 15) {
    score = 90 - Math.min(10, avgSentenceLen);
  } else if (avgSentenceLen <= 25) {
    score = 75 - (avgSentenceLen - 15) * 2.5;
  } else {
    score = 50 - Math.min(30, (avgSentenceLen - 25) * 1.5);
  }

  // Penalise very long paragraphs
  const paras = paragraphs(text);
  const longParas = paras.filter(
    (p) => arabicWords(p).length > 200
  ).length;
  score -= longParas * 5;

  // Penalise lack of headings in long articles
  const totalHeadings = headings.h1 + headings.h2 + headings.h3;
  if (wordCount > 600 && totalHeadings === 0) score -= 10;

  score = Math.max(10, Math.min(100, Math.round(score)));

  let label: string;
  if (score >= 70) label = "سهل";
  else if (score >= 50) label = "متوسط";
  else label = "صعب";

  return { score, label };
}

// ---------------------------------------------------------------------------
// Entity extraction
// ---------------------------------------------------------------------------

function extractEntities(text: string): string[] {
  const found = new Set<string>();

  // 1. MENA country names
  for (const country of MENA_COUNTRIES) {
    if (text.includes(country)) {
      found.add(country);
    }
  }

  // 2. Organisation patterns: words preceding known org suffixes
  const orgPattern = new RegExp(
    `[\\u0600-\\u06FF]+(?:\\s[\\u0600-\\u06FF]+){0,3}\\s+(${ORG_SUFFIXES.join("|")})`,
    "g"
  );
  let m: RegExpExecArray | null;
  while ((m = orgPattern.exec(text)) !== null) {
    found.add(m[0].trim());
  }

  // 3. Person title + name patterns
  const personPattern = new RegExp(
    `(${PERSON_TITLES.join("|")})\\s+[\\u0600-\\u06FF]+(?:\\s[\\u0600-\\u06FF]+){0,2}`,
    "g"
  );
  while ((m = personPattern.exec(text)) !== null) {
    found.add(m[0].trim());
  }

  // 4. Financial instrument patterns
  const finPattern = new RegExp(
    `(${FINANCIAL_INSTRUMENTS.join("|")})\\s+[\\u0600-\\u06FF]+(?:\\s[\\u0600-\\u06FF]+){0,1}`,
    "g"
  );
  while ((m = finPattern.exec(text)) !== null) {
    found.add(m[0].trim());
  }

  // Deduplicate and return max 10
  return Array.from(found).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Suggested tags
// ---------------------------------------------------------------------------

function buildSuggestedTags(entities: string[], sectionSlug?: string): string[] {
  const tags = new Set<string>(entities);
  if (sectionSlug) tags.add(sectionSlug);
  return Array.from(tags).slice(0, 12);
}

// ---------------------------------------------------------------------------
// SEO issue checks
// ---------------------------------------------------------------------------

function buildIssues(
  params: {
    wordCount: number;
    articleType: string | undefined;
    headingCount: HeadingCount;
    metaTitleLength: number;
    metaDescLength: number;
    keywordDensity: number | null;
    keywordInTitle: boolean | null;
    keywordInFirstParagraph: boolean | null;
    hasExcerpt: boolean;
  }
): SEOIssue[] {
  const issues: SEOIssue[] = [];

  // --- Word count ---
  const typeLimits =
    WORD_COUNT_TARGETS[params.articleType ?? ""] ??
    WORD_COUNT_TARGETS.default;

  if (params.wordCount < typeLimits.min * 0.8) {
    issues.push({
      severity: "error",
      message: `عدد الكلمات (${params.wordCount}) أقل بكثير من الحد الأدنى المطلوب (${typeLimits.min} كلمة) لهذا النوع من المقالات.`,
    });
  } else if (params.wordCount < typeLimits.min) {
    issues.push({
      severity: "warning",
      message: `عدد الكلمات (${params.wordCount}) أقل من الحد الأدنى الموصى به (${typeLimits.min} كلمة).`,
    });
  } else if (params.wordCount > typeLimits.max) {
    issues.push({
      severity: "info",
      message: `عدد الكلمات (${params.wordCount}) يتجاوز الحد الأقصى الموصى به (${typeLimits.max} كلمة). فكر في تقسيم المقال.`,
    });
  }

  // --- H1 count ---
  if (params.headingCount.h1 > 1) {
    issues.push({
      severity: "error",
      message: `يحتوي المقال على ${params.headingCount.h1} عناوين H1. يجب أن يكون هناك عنوان H1 واحد فقط.`,
    });
  }

  // --- Title length ---
  if (params.metaTitleLength > 65) {
    issues.push({
      severity: "error",
      message: `العنوان (${params.metaTitleLength} حرف) يتجاوز الحد الأقصى لمحركات البحث (65 حرف). سيُقطع في نتائج البحث.`,
    });
  } else if (params.metaTitleLength < 20) {
    issues.push({
      severity: "error",
      message: `العنوان (${params.metaTitleLength} حرف) قصير جداً. يُنصح بأن يكون بين 20 و65 حرفاً.`,
    });
  }

  // --- Meta description ---
  if (!params.hasExcerpt || params.metaDescLength === 0) {
    issues.push({
      severity: "warning",
      message: "الوصف التعريفي (meta description) مفقود. أضف مقتطفاً لتحسين ظهور المقال في نتائج البحث.",
    });
  } else if (params.metaDescLength > 160) {
    issues.push({
      severity: "error",
      message: `الوصف التعريفي (${params.metaDescLength} حرف) يتجاوز الحد الأقصى (160 حرف). سيُقطع في نتائج البحث.`,
    });
  } else if (params.metaDescLength < 80) {
    issues.push({
      severity: "error",
      message: `الوصف التعريفي (${params.metaDescLength} حرف) قصير جداً. يُنصح بأن يكون بين 80 و160 حرفاً.`,
    });
  }

  // --- Keyword density ---
  if (params.keywordDensity !== null) {
    if (params.keywordDensity < 0.5) {
      issues.push({
        severity: "warning",
        message: `كثافة الكلمة المفتاحية (${params.keywordDensity}%) منخفضة جداً. يُنصح بأن تكون بين 0.5% و3%.`,
      });
    } else if (params.keywordDensity > 3) {
      issues.push({
        severity: "warning",
        message: `كثافة الكلمة المفتاحية (${params.keywordDensity}%) مرتفعة. قد تُعاقَب بسبب الحشو الزائد للكلمات المفتاحية.`,
      });
    }
  }

  // --- Keyword in title ---
  if (params.keywordInTitle === false) {
    issues.push({
      severity: "warning",
      message: "الكلمة المفتاحية المستهدفة غير موجودة في العنوان. أضفها لتعزيز الأهمية الموضوعية.",
    });
  }

  // --- Keyword in first paragraph ---
  if (params.keywordInFirstParagraph === false) {
    issues.push({
      severity: "warning",
      message: "الكلمة المفتاحية المستهدفة غير موجودة في الفقرة الأولى. يُفضّل ذكرها مبكراً في المقال.",
    });
  }

  // Sort: errors first, then warnings, then info
  const order: Record<SEOIssue["severity"], number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return issues;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = seoAnalysisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues.map((i) => i.message).join(", "),
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const {
    content,
    title,
    excerpt,
    targetKeyword,
    articleType,
    sectionSlug,
  }: SeoAnalysisInput = parsed.data;

  // Compute all signals
  const wordCount = countWords(content);
  const headingCount = countHeadings(content);

  const keywordDensity =
    targetKeyword && targetKeyword.trim()
      ? calcKeywordDensity(content, targetKeyword)
      : null;

  const keywordInTitle =
    targetKeyword && targetKeyword.trim()
      ? title.includes(targetKeyword.trim())
      : null;

  const keywordInFirstPara =
    targetKeyword && targetKeyword.trim()
      ? keywordInFirstParagraph(content, targetKeyword)
      : null;

  const { score: readabilityScore, label: readabilityLabel } = calcReadability(
    content,
    headingCount,
    wordCount
  );

  const entities = extractEntities(content);
  const suggestedTags = buildSuggestedTags(entities, sectionSlug);

  const metaTitleLength = title.length;
  const metaDescLength = (excerpt ?? "").length;

  const issues = buildIssues({
    wordCount,
    articleType,
    headingCount,
    metaTitleLength,
    metaDescLength,
    keywordDensity,
    keywordInTitle,
    keywordInFirstParagraph: keywordInFirstPara,
    hasExcerpt: Boolean(excerpt && excerpt.trim().length > 0),
  });

  const result: SEOAnalysisResult = {
    wordCount,
    headingCount,
    keywordDensity,
    keywordInTitle,
    keywordInFirstParagraph: keywordInFirstPara,
    readabilityScore,
    readabilityLabel,
    entities,
    suggestedTags,
    metaTitleLength,
    metaDescLength,
    issues,
  };

  return NextResponse.json({ data: result } satisfies ApiResponse<SEOAnalysisResult>);
}
