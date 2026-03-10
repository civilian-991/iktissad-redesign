/**
 * Revenue Analytics Dashboard — Server Wrapper
 * /admin/revenue
 */

import type { Metadata } from "next";
import RevenueClient from "./RevenueClient";

export const metadata: Metadata = {
  title: "تحليلات الإيرادات | لوحة الإدارة",
  description: "إحصائيات MRR والمشتركين وتوزيع الخطط",
};

export default function RevenuePage() {
  return <RevenueClient />;
}
