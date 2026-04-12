/**
 * Headline A/B Testing Dashboard — Server Wrapper
 * /admin/headline-tests
 */

import type { Metadata } from "next";
import HeadlineTestsClient from "./HeadlineTestsClient";

export const metadata: Metadata = {
  title: "اختبار العناوين A/B | لوحة الإدارة",
  description: "اختبر عناوين مختلفة واكتشف الأفضل أداءً",
};

export default function HeadlineTestsPage() {
  return <HeadlineTestsClient />;
}
