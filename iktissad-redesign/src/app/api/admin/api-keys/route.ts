/**
 * Admin API Key Management — List & Create
 * GET  /api/admin/api-keys  → list all keys (no raw key returned)
 * POST /api/admin/api-keys  → create new key (raw key returned ONCE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse, ApiKey, ApiKeyScope } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** SHA-256 hash using Web Crypto (Node 18+ / Edge) */
async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Generate a secure API key: ikt_ + 32 random hex chars */
function generateRawKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `ikt_${hex}`;
}

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
// Validation schemas
// ---------------------------------------------------------------------------

const VALID_SCOPES: ApiKeyScope[] = [
  'read:articles',
  'read:sections',
  'read:sectors',
  'read:countries',
  'read:series',
];

const CreateSchema = z.object({
  name:               z.string().min(1).max(120),
  scopes:             z.array(z.enum(['read:articles', 'read:sections', 'read:sectors', 'read:countries', 'read:series'])).min(1).default(['read:articles', 'read:sections']),
  rateLimitPerMinute: z.number().int().min(1).max(1000).optional().default(60),
  expiresAt:          z.string().datetime().optional(),
});

// Keep VALID_SCOPES import used
void VALID_SCOPES;

// ---------------------------------------------------------------------------
// GET — list all API keys
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<ApiKey[]>>({
    data: ((data as unknown[]) ?? []).map((r) => mapRow(r as Record<string, unknown>)),
  });
}

// ---------------------------------------------------------------------------
// POST — create a new API key
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const { name, scopes, rateLimitPerMinute, expiresAt } = parsed.data;

  // Generate key material
  const rawKey = generateRawKey();
  const keyHash = await sha256Hex(rawKey);
  const keyPrefix = rawKey.slice(0, 8); // "ikt_XXXX"

  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from('api_keys')
    .insert({
      name,
      key_hash:              keyHash,
      key_prefix:            keyPrefix,
      scopes,
      rate_limit_per_minute: rateLimitPerMinute,
      created_by:            auth.userId ?? null,
      expires_at:            expiresAt ?? null,
      is_active:             true,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error?.message ?? 'Insert failed' },
      { status: 500 }
    );
  }

  const keyRecord = mapRow(data as unknown as Record<string, unknown>);

  // Return raw key ONCE — it is never stored, only the hash is.
  return NextResponse.json(
    {
      data: keyRecord,
      rawKey,  // shown to user ONE TIME only
    },
    { status: 201 }
  );
}
