/**
 * Admin New Promo Code Page — Server Wrapper
 */
import type { Metadata } from 'next';
import PromoFormClient from './PromoFormClient';

export const metadata: Metadata = {
  title: 'إنشاء كوبون خصم | لوحة الإدارة',
};

export default function NewPromoCodePage() {
  return <PromoFormClient />;
}
