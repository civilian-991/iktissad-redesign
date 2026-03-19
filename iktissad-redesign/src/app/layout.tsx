import type { Metadata } from "next";
import { Tajawal, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import CookieConsent from "@/components/CookieConsent";
import SentryUserIdentification from "@/components/SentryUserIdentification";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-accent",
  display: "swap",
});

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
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${playfair.variable}`}>
      <body className="antialiased min-h-screen bg-cream">
        <Providers>
          {children}
          <SentryUserIdentification />
        </Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
