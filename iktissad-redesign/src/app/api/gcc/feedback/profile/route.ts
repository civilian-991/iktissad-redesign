/**
 * POST /api/gcc/feedback/profile — recompute + persist the editorial profile.
 *
 * Called by an n8n weekly cron (plan v4 §2.4). Aggregates the decision log into
 * the per-category profile + blind-spot report, saves it to site_settings
 * (key 'gcc_editorial_profile') for injection into the classifier/drafting
 * prompts, and returns it. Secret-header auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkGccSecret } from '@/lib/gcc/auth';
import { computeEditorialProfile, saveEditorialProfile } from '@/lib/gcc/feedback';

const schema = z.object({ sinceISO: z.string().optional() }).optional();

export async function POST(request: NextRequest) {
  const denied = checkGccSecret(request);
  if (denied) return denied;

  let sinceISO: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    sinceISO = schema.parse(body)?.sinceISO;
  } catch {
    /* no body is fine */
  }

  try {
    const profile = await computeEditorialProfile(new Date().toISOString(), sinceISO);
    await saveEditorialProfile(profile);
    return NextResponse.json({ data: profile });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'profile computation failed' },
      { status: 500 }
    );
  }
}
