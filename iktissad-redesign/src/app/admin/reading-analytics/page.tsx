/**
 * Reading Analytics Dashboard — Server Wrapper
 * /admin/reading-analytics
 */

import type { Metadata } from "next";
import ReadingAnalyticsClient from "./ReadingAnalyticsClient";

export const metadata: Metadata = {
  title: "تحليلات القراءة | لوحة الإدارة",
  description: "أكثر المقالات قراءة، معدلات التمرير، وأداء الأقسام",
};

export default function ReadingAnalyticsPage() {
  return <ReadingAnalyticsClient />;
}
