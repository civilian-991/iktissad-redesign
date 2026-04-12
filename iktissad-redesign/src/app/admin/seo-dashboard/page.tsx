/**
 * SEO Performance Dashboard — Server Wrapper
 * /admin/seo-dashboard
 */

import type { Metadata } from "next";
import SeoDashboardClient from "./SeoDashboardClient";

export const metadata: Metadata = {
  title: "لوحة SEO | لوحة الإدارة",
  description: "تقييم تحسين محركات البحث لكل مقال",
};

export default function SeoDashboardPage() {
  return <SeoDashboardClient />;
}
