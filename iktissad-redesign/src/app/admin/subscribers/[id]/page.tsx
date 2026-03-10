/**
 * Admin Subscriber Profile Page — Server Wrapper
 * IKTISSAD Design System
 */

import type { Metadata } from 'next';
import SubscriberProfileClient from './SubscriberProfileClient';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `ملف المشترك | لوحة الإدارة`,
    description: `إدارة بيانات المشترك ${id}`,
  };
}

export default async function SubscriberProfilePage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return <SubscriberProfileClient id={id} />;
}
