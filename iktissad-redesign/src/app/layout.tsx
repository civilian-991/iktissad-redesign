import type { Metadata } from "next";
import { Tajawal, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import CookieConsent from "@/components/CookieConsent";
import SentryUserIdentification from "@/components/SentryUserIdentification";
import { GoogleAnalytics } from "@next/third-parties/google";

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
  // Google Search Console ownership verification
  // Set NEXT_PUBLIC_GSC_VERIFICATION in your environment variables
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION && {
    verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION },
  }),
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

        {/* Google Ad Manager — GPT library + single-request mode init */}
        {process.env.NEXT_PUBLIC_GAM_NETWORK_CODE && (
          <>
            <Script
              id="gpt-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.googletag = window.googletag || {cmd: []};
googletag.cmd.push(function() {
  googletag.pubads().enableSingleRequest();
  googletag.pubads().collapseEmptyDivs();
  googletag.enableServices();
});`,
              }}
            />
            <Script
              src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"
              strategy="afterInteractive"
            />
          </>
        )}
      </body>

      {/* Google Analytics 4 */}
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
    </html>
  );
}
