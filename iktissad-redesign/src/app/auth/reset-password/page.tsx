import type { Metadata } from 'next';
import ResetPasswordClient from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'إعادة تعيين كلمة المرور | الإقتصاد والأعمال',
  description: 'إعادة تعيين كلمة المرور',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
