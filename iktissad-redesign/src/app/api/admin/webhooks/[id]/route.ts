import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse, Webhook } from '@/types';

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  url: z.string().url().optional(),
  secret: z.string().min(8).max(256).optional(),
  events: z.array(z.string()).min(1).optional(),
  enabled: z.boolean().optional(),
});

function mapRow(row: Record<string, unknown>): Webhook {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    secret: row.secret as string,
    events: row.events as string[],
    enabled: row.enabled as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  } as unknown as Webhook;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();
  const { id } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin.from('webhooks').select('*').eq('id', id).single();

  if (error || !data) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json<ApiResponse<Webhook>>({
    data: mapRow(data as unknown as Record<string, unknown>),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('webhooks')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error?.message ?? 'Update failed' },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<Webhook>>({
    data: mapRow(data as unknown as Record<string, unknown>),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();
  const { id } = await params;

  const admin = createAdminClient();
  const { error } = await admin.from('webhooks').delete().eq('id', id);

  if (error) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<{ deleted: true }>>({ data: { deleted: true } });
}
