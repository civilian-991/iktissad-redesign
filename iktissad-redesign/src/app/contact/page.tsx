import type { Metadata } from 'next';
import ContactPageClient from './PageClient';
import { getSiteSetting, type ContactInfo } from '@/lib/site-settings';

export const metadata: Metadata = {
  title: 'اتصل بنا | الإقتصاد والأعمال',
  description: 'تواصل مع فريق مجلة الإقتصاد والأعمال للاستفسارات والملاحظات والتعاون',
};

export default async function ContactPage() {
  const contactInfo = await getSiteSetting<ContactInfo>('contact_info');
  return <ContactPageClient contactInfo={contactInfo} />;
}
