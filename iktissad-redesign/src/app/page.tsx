import Header from '@/components/Header';
import Hero from '@/components/Hero';
import LatestNews from '@/components/LatestNews';
import SectorNews from '@/components/SectorNews';
import VideoSection from '@/components/VideoSection';
import CountryNews from '@/components/CountryNews';
import FeaturedMagazine from '@/components/FeaturedMagazine';
import FeaturedProfiles from '@/components/FeaturedProfiles';
import Newsletter from '@/components/Newsletter';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <Hero />
        <LatestNews />
        <CountryNews />
        <FeaturedMagazine />
        <VideoSection />
        <SectorNews />
        <FeaturedProfiles />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
