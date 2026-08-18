import { SITE_URL } from '@/lib/site-config';
import type { Metadata } from "next";
import { Tajawal, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import CookieConsent from "@/components/CookieConsent";
import ConsentScripts from "@/components/ConsentScripts";
import SentryUserIdentification from "@/components/SentryUserIdentification";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import StagingBanner from "@/components/StagingBanner";

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
  // Resolves relative canonical/OG URLs set per-page (e.g. canonical: "/").
  metadataBase: new URL(SITE_URL),
  title: "الإقتصاد والأعمال | Al-Iktissad Wal-Aamal",
  description: "المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي. تغطية شاملة لأسواق المال والأعمال والتجارة في الشرق الأوسط.",
  keywords: ["اقتصاد", "أعمال", "مال", "أخبار اقتصادية", "السعودية", "الإمارات", "مصر", "لبنان", "قطر", "الكويت"],
  authors: [{ name: "مجموعة الإقتصاد والأعمال" }],
  openGraph: {
    title: "الإقتصاد والأعمال | Al-Iktissad Wal-Aamal",
    description: "المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي",
    url: SITE_URL,
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
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  // NOTE: no site-wide `alternates.canonical` here. A hardcoded canonical in the
  // root layout was inherited by every route, telling Google that /articles,
  // /topics/*, etc. were duplicates of the homepage. Each page now sets its own
  // canonical (homepage below, article pages in [slug]/page.tsx); pages without
  // an explicit canonical self-canonicalize to their actual URL.
  // Google Search Console ownership verification
  // Set NEXT_PUBLIC_GSC_VERIFICATION in your environment variables
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION && {
    verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION },
  }),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the CSP nonce injected by proxy.ts (src/proxy.ts) for this request.
  // Pass it to Script components so inline scripts are nonce-approved.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : null;

  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${playfair.variable}`}>
      <head>
        {/* Preconnect: establishes early connections to critical origins */}
        {supabaseHostname && (
          <link rel="preconnect" href={`https://${supabaseHostname}`} />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS-prefetch: hint for third-party domains */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://securepubads.g.doubleclick.net" />
        <link rel="dns-prefetch" href="https://challenges.cloudflare.com" />
      </head>
      <body className="antialiased min-h-screen bg-cream">
        <StagingBanner />
        <Providers>
          {children}
          <SentryUserIdentification />
        </Providers>
        <CookieConsent />
        <WebVitalsReporter />

        {/* GA + GAM load only after cookie consent (analytics/advertising) */}
        <ConsentScripts
          nonce={nonce}
          gaMeasurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
          gamNetworkCode={process.env.NEXT_PUBLIC_GAM_NETWORK_CODE}
        />
      </body>
    </html>
  );
}
