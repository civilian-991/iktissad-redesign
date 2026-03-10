/**
 * Admin Audit Log Page — Server Wrapper
 * IKTISSAD Design System
 */

import type { Metadata } from 'next';
import AuditLogClient from './AuditLogClient';

export const metadata: Metadata = {
  title: 'سجل المراجعة | لوحة الإدارة',
};

export default async function AuditLogPage() {
  return <AuditLogClient />;
}
