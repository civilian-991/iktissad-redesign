import type { Metadata } from 'next';
import ContactPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'اتصل بنا | الإقتصاد والأعمال',
  description: 'تواصل مع فريق مجلة الإقتصاد والأعمال للاستفسارات والملاحظات والتعاون',
};

export default function ContactPage() {
  return <ContactPageClient />;
}
