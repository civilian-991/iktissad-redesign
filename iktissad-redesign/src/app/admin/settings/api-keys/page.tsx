import type { Metadata } from 'next';
import ApiKeysClient from './ApiKeysClient';

export const metadata: Metadata = {
  title: 'مفاتيح API | لوحة التحكم',
};

export default function ApiKeysPage() {
  return <ApiKeysClient />;
}
