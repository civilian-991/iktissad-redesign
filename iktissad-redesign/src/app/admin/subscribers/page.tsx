/**
 * Admin Subscribers Page — Server Wrapper
 * IKTISSAD Design System
 */

import type { Metadata } from 'next';
import SubscribersClient from './SubscribersClient';

export const metadata: Metadata = {
  title: 'المشتركون | لوحة الإدارة',
  description: 'إدارة مشتركي الإقتصاد والأعمال',
};

export default function SubscribersPage() {
  return <SubscribersClient />;
}
