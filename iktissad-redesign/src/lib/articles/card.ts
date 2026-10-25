import type { Article, MagazineIssue } from "@/types";

/**
 * `?fields=card` on public list endpoints: drop the article body so a list of
 * 20 is ~20 KB instead of ~450 KB. Used by the mobile app's feeds, which only
 * render title / excerpt / image / date and fetch the body on open.
 */
export function wantsCards(searchParams: URLSearchParams): boolean {
  return searchParams.get("fields") === "card";
}

export function toArticleCard(article: Article): Article {
  return { ...article, content: "", contentEn: "", body: undefined };
}

/** Issue lists don't need the per-page image arrays (up to ~200 URLs each). */
export function toIssueCard(issue: MagazineIssue): MagazineIssue {
  return { ...issue, pagesImages: [], pageLabels: [] };
}
