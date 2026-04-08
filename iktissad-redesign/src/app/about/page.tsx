import type { Metadata } from 'next';
import AboutPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'مجموعة الاقتصاد والأعمال — من الفهم إلى القرار',
  description: 'منذ أكثر من خمسين عاماً، تعمل مجموعة الاقتصاد والأعمال في المساحة بين الخبر والقرار — موقع، مجلة، مجلة الدفاعية، مجلة الحسناء، ومؤتمرات ضمن رؤية واحدة.',
};

export default function AboutPage() {
  return <AboutPageClient />;
}
