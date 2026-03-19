/**
 * Public API v1 — Sectors
 * GET /api/v1/sectors
 *
 * Auth: Bearer API key
 * Required scope: read:sectors
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, apiKeyUnauthorizedResponse, apiKeyRateLimitResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const endpoint = '/api/v1/sectors';

  const auth = await validateApiKey(request, { endpoint });
  if (!auth.valid) {
    if (auth.error === 'Rate limit exceeded') return apiKeyRateLimitResponse();
    return apiKeyUnauthorizedResponse(auth.error);
  }

  if (!auth.scopes?.includes('read:sectors')) {
    return NextResponse.json(
      { success: false, error: "Scope 'read:sectors' required" },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sectors')
    .select('id, slug, name, name_en, description, description_en')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: { total: (data ?? []).length },
  });
}
