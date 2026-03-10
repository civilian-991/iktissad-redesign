/**
 * Admin Comments Page — Server Wrapper
 * IKTISSAD Design System
 */

import type { Metadata } from 'next';
import CommentsClient from './CommentsClient';

export const metadata: Metadata = {
  title: 'إدارة التعليقات | لوحة الإدارة',
};

export default async function CommentsPage() {
  return <CommentsClient />;
}
