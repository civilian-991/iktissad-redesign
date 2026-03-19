import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse, Webhook } from '@/types';

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url(),
  secret: z.string().min(8).max(256),
  events: z.array(z.string()).min(1),
  enabled: z.boolean().optional().default(true),
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

export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('webhooks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<Webhook[]>>({
    data: ((data as unknown[]) ?? []).map((r) => mapRow(r as Record<string, unknown>)),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('webhooks')
    .insert({
      name: parsed.data.name,
      url: parsed.data.url,
      secret: parsed.data.secret,
      events: parsed.data.events,
      enabled: parsed.data.enabled,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error?.message ?? 'Insert failed' },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<Webhook>>(
    { data: mapRow(data as unknown as Record<string, unknown>) },
    { status: 201 }
  );
}
