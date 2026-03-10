/**
 * Admin New Plan Page — Server Wrapper
 */
import type { Metadata } from 'next';
import PlanFormClient from './PlanFormClient';

export const metadata: Metadata = {
  title: 'إضافة خطة اشتراك | لوحة الإدارة',
};

export default function NewPlanPage() {
  return <PlanFormClient />;
}
