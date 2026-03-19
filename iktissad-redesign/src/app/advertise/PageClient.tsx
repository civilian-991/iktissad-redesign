'use client';

import { motion } from 'motion/react';
import { Users, Eye, TrendingUp, Target, Monitor, Smartphone, Mail, Newspaper, Award } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';

const statsIcons = [Users, Eye, TrendingUp, Target];
const statsValues = ['+2M', '+10M', '68%', '85%'];

const adFormatIcons = [Monitor, Newspaper, Mail, Smartphone];

// Features that are technical terms / kept as-is data (mixed Arabic/English per original)
const adFormatsFeatures = [
  ['Header Banner', 'Sidebar Ads', 'In-Article Ads', 'Footer Banner'],
  null, // from i18n
  null, // from i18n
  ['Interstitial', 'Native Ads', 'Push Notifications', 'In-App Ads'],
];

const audiencePercentages = [35, 25, 20, 12, 8];

export default function AdvertisePageClient() {
  const { t } = useTranslation();

  const stats = statsValues.map((value, i) => ({
    icon: statsIcons[i],
    value,
    label: t(`pages.advertise.stats.${i}.label`),
  }));

  const adFormats = adFormatIcons.map((icon, i) => ({
    icon,
    title: t(`pages.advertise.adFormats.${i}.title`),
    description: t(`pages.advertise.adFormats.${i}.description`),
    features: [0, 1, 2, 3].map((j) => t(`pages.advertise.adFormats.${i}.features.${j}`)),
  }));

  const audience = audiencePercentages.map((percentage, i) => ({
    label: t(`pages.advertise.audience.${i}.label`),
    percentage,
  }));

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-24 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mb-6">
                {t('pages.advertise.title')}
              </h1>
              <p className="text-xl text-white/80 leading-relaxed">
                {t('pages.advertise.subtitle')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-ivory">
          <div className="container-luxury">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-6 text-center shadow-sm"
                >
                  <stat.icon className="mx-auto text-gold mb-3" size={32} />
                  <div className="text-3xl font-[family-name:var(--font-display)] font-black text-navy mb-1">
                    {stat.value}
                  </div>
                  <div className="text-slate text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Advertise */}
        <section className="py-20">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                {t('pages.advertise.whyUsTitle')}
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[Award, Target, TrendingUp].map((Icon, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                    <Icon className="text-gold" size={28} />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-xl mb-2">
                    {t(`pages.advertise.whyUs.${index}.title`)}
                  </h3>
                  <p className="text-slate">
                    {t(`pages.advertise.whyUs.${index}.desc`)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Ad Formats */}
        <section className="py-20 bg-ivory">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                {t('pages.advertise.formatsTitle')}
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {adFormats.map((format, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-8 shadow-lg"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center mb-4">
                    <format.icon className="text-white" size={24} />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-xl mb-2">
                    {format.title}
                  </h3>
                  <p className="text-charcoal mb-4">
                    {format.description}
                  </p>
                  <ul className="grid grid-cols-2 gap-2">
                    {format.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-slate">
                        <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Audience */}
        <section className="py-20">
          <div className="container-luxury">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                  {t('pages.advertise.audienceTitle')}
                </h2>
                <p className="text-charcoal leading-relaxed mb-8">
                  {t('pages.advertise.audienceDesc')}
                </p>

                <div className="space-y-4">
                  {audience.map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between mb-1">
                        <span className="font-[family-name:var(--font-display)] text-navy font-semibold">
                          {item.label}
                        </span>
                        <span className="text-gold font-bold">{item.percentage}%</span>
                      </div>
                      <div className="h-2 bg-sand rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.percentage}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className="h-full bg-gradient-to-r from-gold to-gold-dark rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-navy rounded-2xl p-8 text-white"
              >
                <h3 className="font-[family-name:var(--font-display)] font-bold text-2xl mb-6 text-white">
                  {t('pages.advertise.contactSales')}
                </h3>
                <p className="text-white/70 mb-8">
                  {t('pages.advertise.contactSalesDesc')}
                </p>
                <div className="space-y-4">
                  <a href="mailto:ads@iktissadonline.com" className="flex items-center gap-3 text-white/80 hover:text-gold transition-colors">
                    <Mail size={20} />
                    ads@iktissadonline.com
                  </a>
                </div>
                <a href="/contact" className="btn-gold mt-8 inline-block">
                  {t('pages.advertise.requestQuote')}
                </a>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
