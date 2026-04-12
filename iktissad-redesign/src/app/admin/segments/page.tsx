/**
 * Audience Segmentation Dashboard — Server Wrapper
 * /admin/segments
 */

import type { Metadata } from "next";
import SegmentsClient from "./SegmentsClient";

export const metadata: Metadata = {
  title: "تقسيم الجمهور | لوحة الإدارة",
  description: "أداء المحتوى حسب شرائح القراء",
};

export default function SegmentsPage() {
  return <SegmentsClient />;
}
