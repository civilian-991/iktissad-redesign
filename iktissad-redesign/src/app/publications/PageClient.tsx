'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ExternalLink, BookOpen, Building, Users, Award } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';

const publicationsData = [
  {
    id: 'magazine',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=400&fit=crop',
    url: '#',
    stats: { issues: '+800', years: '68', readers: '+500K' },
  },
  {
    id: 'arab-markets',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop',
    url: '#',
    stats: { issues: '+200', years: '25', readers: '+300K' },
  },
  {
    id: 'banks',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop',
    url: '#',
    stats: { issues: '+150', years: '20', readers: '+200K' },
  },
  {
    id: 'leaders',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=400&fit=crop',
    url: '#',
    stats: { profiles: '+5000', years: '15', countries: '22' },
  },
];

const servicesIcons = [BookOpen, Building, Users, Award];

const statsBarValues = ['68', '4', '22', '+2M'];

const PARTNERS_COUNT = 6;

export default function GroupPageClient() {
  const { t } = useTranslation();

  const publications = publicationsData.map((pub, i) => ({
    ...pub,
    name: t(`pages.group.publicationsList.${i}.name`),
    description: t(`pages.group.publicationsList.${i}.description`),
  }));

  const services = servicesIcons.map((icon, i) => ({
    icon,
    title: t(`pages.group.services.${i}.title`),
    description: t(`pages.group.services.${i}.description`),
  }));

  const partners = Array.from({ length: PARTNERS_COUNT }, (_, i) =>
    t(`pages.group.partnersList.${i}`)
  );

  const statsBar = statsBarValues.map((value, i) => ({
    value,
    label: t(`pages.group.statsBar.${i}.label`),
  }));

  const pubStatLabel = (key: string) => {
    const map: Record<string, string> = {
      issues: t('pages.group.pubStatIssues'),
      years: t('pages.group.pubStatYears'),
      readers: t('pages.group.pubStatReaders'),
      profiles: t('pages.group.pubStatProfiles'),
      countries: t('pages.group.pubStatCountries'),
    };
    return map[key] ?? key;
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-24 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-gold to-gold-dark rounded-2xl flex items-center justify-center shadow-gold">
                  <span className="text-white font-[family-name:var(--font-display)] font-black text-4xl">إ</span>
                </div>
              </div>
              <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mb-4">
                {t('pages.group.title')}
              </h1>
              <p className="text-xl text-white/80 leading-relaxed">
                {t('pages.group.heroSubtitle')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-gold py-8 -mt-1">
          <div className="container-luxury">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {statsBar.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="text-4xl font-[family-name:var(--font-display)] font-black text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-white/80 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Publications */}
        <section className="py-20">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                {t('pages.group.publications')}
              </h2>
              <p className="text-slate max-w-2xl mx-auto">
                {t('pages.group.publicationsSubtitle')}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {publications.map((pub, index) => (
                <motion.a
                  key={pub.id}
                  href={pub.url}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={pub.image}
                      alt={pub.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" />
                    <div className="absolute bottom-4 inset-x-4">
                      <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-white">
                        {pub.name}
                      </h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-slate mb-4">{pub.description}</p>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {Object.entries(pub.stats).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className="text-xl font-[family-name:var(--font-display)] font-bold text-navy">
                            {value}
                          </div>
                          <div className="text-xs text-slate">
                            {pubStatLabel(key)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-end text-gold group-hover:gap-3 transition-all">
                      <span className="font-[family-name:var(--font-display)] font-semibold text-sm">
                        {t('pages.group.visitSite')}
                      </span>
                      <ExternalLink size={16} className="ms-1" />
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="py-20 bg-ivory">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                {t('pages.group.servicesTitle')}
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow text-center"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center mx-auto mb-4">
                    <service.icon className="text-white" size={24} />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy mb-2">
                    {service.title}
                  </h3>
                  <p className="text-slate text-sm">{service.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Partners */}
        <section className="py-20 bg-navy">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-white mb-4">
                {t('pages.group.partners')}
              </h2>
              <p className="text-white/70">
                {t('pages.group.partnersSubtitle')}
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {partners.map((partner, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center hover:bg-white/20 transition-colors"
                >
                  <span className="text-white/80 text-sm font-[family-name:var(--font-display)]">
                    {partner}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-gold to-gold-dark rounded-2xl p-12 text-center"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-white mb-4">
                {t('pages.group.ctaTitle')}
              </h2>
              <p className="text-white/80 mb-8 max-w-2xl mx-auto">
                {t('pages.group.ctaDesc')}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gold rounded-lg font-[family-name:var(--font-display)] font-bold hover:bg-navy hover:text-white transition-colors"
              >
                {t('pages.contact.title')}
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
