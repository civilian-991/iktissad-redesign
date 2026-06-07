/**
 * TS client for the Arabic NER microservice (services/gcc-ner).
 *
 * Graceful: if GCC_NER_URL is unset or the service is down, returns [] so the
 * pipeline degrades (no entity linking) instead of failing. Never throws.
 */

export type EntityType = 'ORG' | 'PERS' | 'LOC' | 'MISC';

export interface EntitySpan {
  text: string;
  type: EntityType;
  start: number;
  end: number;
}

/** Extract entity spans from Arabic text. Returns [] when NER is unavailable. */
export async function nerExtract(text: string, timeoutMs = 8000): Promise<EntitySpan[]> {
  const base = process.env.GCC_NER_URL;
  if (!base || !text?.trim()) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/ner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { spans?: EntitySpan[] };
    return data.spans ?? [];
  } catch {
    return []; // service down / timeout → degrade gracefully
  } finally {
    clearTimeout(timer);
  }
}

/** Convenience: just the organization (issuer) names. */
export async function extractOrgs(text: string): Promise<string[]> {
  return (await nerExtract(text)).filter((s) => s.type === 'ORG').map((s) => s.text);
}

/** Convenience: just person names (executives/board). */
export async function extractPersons(text: string): Promise<string[]> {
  return (await nerExtract(text)).filter((s) => s.type === 'PERS').map((s) => s.text);
}
