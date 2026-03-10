/**
 * Audit Log Helper
 *
 * Inserts a record into the audit_log table via the admin client.
 * Always silent-fails — never throws, never blocks the calling request.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditActionParams {
  actorId: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: object;
  newValues?: object;
  ipAddress?: string;
}

export async function logAuditAction(params: AuditActionParams): Promise<void> {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('audit_log') as any).insert({
      actor_id: params.actorId,
      actor_email: params.actorEmail,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
      ip_address: params.ipAddress ?? null,
    });
  } catch (err) {
    console.warn('[audit] Failed to log audit action:', err);
  }
}
