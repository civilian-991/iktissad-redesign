import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse, AutomationRule } from '@/types';

const UpdateSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

function mapRow(row: Record<string, unknown>): AutomationRule {
  return {
    id: row.id as string,
    ruleKey: row.rule_key as string,
    name: row.name as string,
    description: row.description as string | null,
    triggerEvent: row.trigger_event as string,
    actionType: row.action_type as AutomationRule['actionType'],
    config: row.config as Record<string, unknown>,
    enabled: row.enabled as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
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
  const { data, error } = await admin
    .from('automation_rules')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json<ApiResponse<AutomationRule>>({
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
  const updateData: Record<string, unknown> = {};
  if (parsed.data.enabled !== undefined) updateData.enabled = parsed.data.enabled;
  if (parsed.data.config !== undefined) updateData.config = parsed.data.config;
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

  const { data, error } = await admin
    .from('automation_rules')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: error?.message ?? 'Update failed' }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<AutomationRule>>({
    data: mapRow(data as unknown as Record<string, unknown>),
  });
}
