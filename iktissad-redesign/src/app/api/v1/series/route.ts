/**
 * Public API v1 — Series (Dossiers)
 * GET /api/v1/series
 *
 * Auth: Bearer API key
 * Required scope: read:series
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, apiKeyUnauthorizedResponse, apiKeyRateLimitResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const endpoint = '/api/v1/series';

  const auth = await validateApiKey(request, { endpoint });
  if (!auth.valid) {
    if (auth.error === 'Rate limit exceeded') return apiKeyRateLimitResponse();
    return apiKeyUnauthorizedResponse(auth.error);
  }

  if (!auth.scopes?.includes('read:series')) {
    return NextResponse.json(
      { success: false, error: "Scope 'read:series' required" },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('article_series')
    .select('id, slug, title, title_en, description, description_en, cover_image, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: { total: (data ?? []).length },
  });
}
