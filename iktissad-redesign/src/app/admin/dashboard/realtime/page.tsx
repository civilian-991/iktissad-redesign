/**
 * Real-Time Editorial Dashboard — Server Wrapper
 * /admin/dashboard/realtime
 */

import type { Metadata } from "next";
import RealtimeDashboardClient from "./RealtimeDashboardClient";

export const metadata: Metadata = {
  title: "اللوحة الحية | لوحة الإدارة",
  description: "بيانات مباشرة: القراء النشطون، المقالات الرائجة، أداء الأخبار العاجلة",
};

export default function RealtimeDashboardPage() {
  return <RealtimeDashboardClient />;
}
