/**
 * Social Share Analytics — Server Wrapper
 * /admin/share-analytics
 */

import type { Metadata } from "next";
import ShareAnalyticsClient from "./ShareAnalyticsClient";

export const metadata: Metadata = {
  title: "تحليلات المشاركة | لوحة الإدارة",
  description: "كيف يشارك القراء المحتوى عبر المنصات المختلفة",
};

export default function ShareAnalyticsPage() {
  return <ShareAnalyticsClient />;
}
