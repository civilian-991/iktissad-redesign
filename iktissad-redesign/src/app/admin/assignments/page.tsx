import type { Metadata } from "next";
import AssignmentsClient from "./AssignmentsClient";

export const metadata: Metadata = {
  title: "لوحة المهام — إكتصاد",
  description: "إدارة مهام المقالات والتخصيصات التحريرية",
};

export default function AssignmentsPage() {
  return <AssignmentsClient />;
}
