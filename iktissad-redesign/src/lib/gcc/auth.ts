/**
 * Shared-secret auth for GCC newsroom endpoints called by n8n (not an authed
 * user). n8n sends `x-gcc-secret`; we compare against GCC_WEBHOOK_SECRET.
 */

import { NextResponse } from 'next/server';

export function checkGccSecret(request: Request): NextResponse | null {
  const expected = process.env.GCC_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'GCC_WEBHOOK_SECRET not configured' }, { status: 503 });
  }
  const got = request.headers.get('x-gcc-secret');
  if (!got || got !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null; // ok
}
