import type { Metadata } from "next";
import SeriesClient from "./SeriesClient";

export const metadata: Metadata = {
  title: "الملفات التحريرية | لوحة التحكم",
  description: "إدارة الملفات والتحقيقات الصحفية",
};

export default function SeriesPage() {
  return <SeriesClient />;
}
