import { NextResponse } from 'next/server';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse, AutomationRule } from '@/types';

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

export async function GET() {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('automation_rules')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<AutomationRule[]>>({
    data: ((data as unknown[]) ?? []).map((r) => mapRow(r as Record<string, unknown>)),
  });
}
