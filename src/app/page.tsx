import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SectorNews from '@/components/SectorNews';
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
        <Hero />
        <SectorNews />
        <FeaturedMagazine />
        <CountryNews />
        <FeaturedProfiles />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
