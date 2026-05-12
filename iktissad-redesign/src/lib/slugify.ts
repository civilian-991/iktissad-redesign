// Generate a URL-safe slug from Arabic or English text.
// Keeps a–z, 0–9, hyphens, and the Arabic Unicode block (U+0600–U+06FF).
// Strips punctuation (including « », parentheses, em-dashes), collapses runs of hyphens,
// and trims leading/trailing hyphens.
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-؀-ۿ]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
