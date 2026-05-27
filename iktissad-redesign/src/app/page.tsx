import type { Metadata } from 'next';
import Header from '@/components/Header';
import Hero from '@/components/Hero';

export const revalidate = 300; // 5 minutes — homepage shows latest news

// Self-referencing canonical (resolved against metadataBase in layout.tsx).
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};
import LatestNews from '@/components/LatestNews';
import CompaniesSection from '@/components/CompaniesSection';
import SectorNews from '@/components/SectorNews';
import CountryNews from '@/components/CountryNews';
import VideoSection from '@/components/VideoSection';
import FeaturedProfiles from '@/components/FeaturedProfiles';
import OpinionSection from '@/components/OpinionSection';
import FilesSection from '@/components/FilesSection';
import FeaturedMagazine from '@/components/FeaturedMagazine';
import Newsletter from '@/components/Newsletter';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Single page H1 for SEO/accessibility — visually hidden, the visible
            hero headlines remain the design focus. */}
        <h1 className="sr-only">
          الإقتصاد والأعمال — أخبار الاقتصاد والأعمال والأسواق المالية في العالم العربي
        </h1>
        <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        {/* 1. Featured */}
        <Hero />
        {/* 2. Latest News */}
        <LatestNews />
        {/* 3. Companies */}
        <CompaniesSection />
        {/* 4. Sectors */}
        <SectorNews />
        {/* 5. Countries */}
        <CountryNews />
        {/* 6. Video */}
        <VideoSection />
        {/* 7. Profiles */}
        <FeaturedProfiles />
        {/* 8. Opinion */}
        <OpinionSection />
        {/* 9. ملفات */}
        <FilesSection />
        {/* 11. Magazine */}
        <FeaturedMagazine />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
