/**
 * Admin API Key — Individual key management
 * GET    /api/admin/api-keys/[id]  → fetch single key
 * PATCH  /api/admin/api-keys/[id]  → update name / scopes / rate limit / active
 * DELETE /api/admin/api-keys/[id]  → permanently delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse, ApiKey, ApiKeyScope } from '@/types';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, unknown>): ApiKey {
  return {
    id:                 row.id as string,
    name:               row.name as string,
    keyHash:            row.key_hash as string,
    keyPrefix:          row.key_prefix as string,
    scopes:             (row.scopes as string[]) as ApiKeyScope[],
    rateLimitPerMinute: row.rate_limit_per_minute as number,
    createdBy:          row.created_by as string | undefined,
    lastUsedAt:         row.last_used_at as string | undefined,
    expiresAt:          row.expires_at as string | undefined,
    isActive:           row.is_active as boolean,
    createdAt:          row.created_at as string,
    updatedAt:          row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const PatchSchema = z.object({
  name:               z.string().min(1).max(120).optional(),
  scopes:             z.array(z.enum(['read:articles', 'read:sections', 'read:sectors', 'read:countries', 'read:series'])).min(1).optional(),
  rateLimitPerMinute: z.number().int().min(1).max(1000).optional(),
  isActive:           z.boolean().optional(),
  expiresAt:          z.string().datetime().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('api_keys')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Not found' },
      { status: 404 }
    );
  }

  return NextResponse.json<ApiResponse<ApiKey>>({
    data: mapRow(data as unknown as Record<string, unknown>),
  });
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name               !== undefined) updates.name                = parsed.data.name;
  if (parsed.data.scopes             !== undefined) updates.scopes              = parsed.data.scopes;
  if (parsed.data.rateLimitPerMinute !== undefined) updates.rate_limit_per_minute = parsed.data.rateLimitPerMinute;
  if (parsed.data.isActive           !== undefined) updates.is_active           = parsed.data.isActive;
  if (parsed.data.expiresAt          !== undefined) updates.expires_at          = parsed.data.expiresAt;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'No fields to update' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from('api_keys')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error?.message ?? 'Update failed' },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<ApiKey>>({
    data: mapRow(data as unknown as Record<string, unknown>),
  });
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  const { id } = await params;
  const admin = createAdminClient();

  const { error } = await admin
    .from('api_keys')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<null>>({ data: null }, { status: 200 });
}
