/**
 * Admin Editorial Calendar Page — Server Wrapper
 * IKTISSAD Design System
 *
 * Minimal server component: provides metadata and renders CalendarClient.
 */

import type { Metadata } from "next";
import CalendarClient from "./CalendarClient";

export const metadata: Metadata = {
  title: "التقويم التحريري | إكتصاد",
  description: "التقويم التحريري لإدارة جدول نشر المقالات",
};

export default function CalendarPage() {
  return <CalendarClient />;
}
