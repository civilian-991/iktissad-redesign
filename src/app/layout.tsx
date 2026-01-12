import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "الإقتصاد والأعمال | Al-Iktissad Wal-Aamal",
  description: "المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي. تغطية شاملة لأسواق المال والأعمال والتجارة في الشرق الأوسط.",
  keywords: ["اقتصاد", "أعمال", "مال", "أخبار اقتصادية", "السعودية", "الإمارات", "مصر", "لبنان", "قطر", "الكويت"],
  authors: [{ name: "مجموعة الإقتصاد والأعمال" }],
  openGraph: {
    title: "الإقتصاد والأعمال | Al-Iktissad Wal-Aamal",
    description: "المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي",
    url: "https://www.iktissadonline.com",
    siteName: "الإقتصاد والأعمال",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "الإقتصاد والأعمال | Al-Iktissad Wal-Aamal",
    description: "المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen bg-cream">
        {children}
      </body>
    </html>
  );
}
