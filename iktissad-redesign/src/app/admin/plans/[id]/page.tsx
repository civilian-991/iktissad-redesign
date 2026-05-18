/**
 * Admin Edit Plan Page — Server Wrapper
 */
import type { Metadata } from 'next';
import PlanEditFormClient from './PlanFormClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'تعديل خطة الاشتراك | لوحة الإدارة' };
}

export default async function EditPlanPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return <PlanEditFormClient id={id} />;
}
