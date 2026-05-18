/**
 * Social Accounts CRUD
 * GET  /api/admin/social-accounts — List all social accounts
 * POST /api/admin/social-accounts — Connect a new social account
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

export interface SocialAccount {
  id: string;
  platform: 'twitter' | 'linkedin' | 'telegram';
  accountName: string;
  active: boolean;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Use SocialAccount[] from GET response instead */
export interface SocialAccountsStatus {
  twitter: { connected: boolean; handle: string | null };
  linkedin: { connected: boolean; name: string | null };
  telegram: { connected: boolean; channelName: string | null };
}

function mapRow(row: Record<string, unknown>): SocialAccount {
  return {
    id: row.id as string,
    platform: row.platform as SocialAccount['platform'],
    accountName: row.account_name as string,
    active: row.active as boolean,
    tokenExpiresAt: (row.token_expires_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function GET() {
  const auth = await requireRole(undefined, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from('social_accounts')
    .select('id, platform, account_name, active, token_expires_at, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: (data ?? []).map(mapRow),
  } satisfies ApiResponse<SocialAccount[]>);
}

const createSchema = z.object({
  platform: z.enum(['twitter', 'linkedin', 'telegram']),
  accountName: z.string().min(1),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireRole(undefined, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { platform, accountName, accessToken, refreshToken, tokenExpiresAt } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from('social_accounts')
    .insert({
      platform,
      account_name: accountName,
      access_token: accessToken,
      refresh_token: refreshToken ?? null,
      token_expires_at: tokenExpiresAt ?? null,
      created_by: auth.userId ?? null,
    })
    .select('id, platform, account_name, active, token_expires_at, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: mapRow(data) }, { status: 201 });
}
