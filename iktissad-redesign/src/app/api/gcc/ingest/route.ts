/**
 * POST /api/gcc/ingest — run the keystone ingest loop for a GCC exchange.
 *
 * Called by the n8n Selector (secret-header auth). Origin-first (Tadawul via
 * Browserbase when configured), Mubasher fallback. Idempotent: already-seen
 * disclosures are skipped. Returns the newly-ingested disclosures (token-cheap
 * handles) for the Selector to classify + post Telegram screening cards.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkGccSecret } from '@/lib/gcc/auth';
import { ingestExchange, type ExchangeCode } from '@/lib/gcc/sourcing';

const schema = z.object({
  exchange: z.enum(['TADAWUL', 'ADX', 'DFM', 'QSE', 'BK', 'BHB', 'MSX']),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export async function POST(request: NextRequest) {
  const denied = checkGccSecret(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    );
  }

  try {
    const result = await ingestExchange(parsed.data.exchange as ExchangeCode, {
      category: parsed.data.category as any,
      limit: parsed.data.limit,
    });
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'ingest failed' },
      { status: 500 }
    );
  }
}
