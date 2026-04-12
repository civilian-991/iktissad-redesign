import type { Metadata } from "next";
import LiveBlogsClient from "./LiveBlogsClient";

export const metadata: Metadata = {
  title: "البث المباشر | إكتصاد",
  description: "إدارة البث المباشر والتحديثات الفورية",
};

export default function LiveBlogsPage() {
  return <LiveBlogsClient />;
}
