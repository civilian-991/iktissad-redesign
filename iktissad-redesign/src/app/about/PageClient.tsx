'use client';

import { motion } from 'motion/react';
import { Target, Eye, Award, Users, Newspaper, Globe, Calendar } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';

const statsIcons = [Calendar, Newspaper, Users, Globe];
const statsValues = ['1956', '+50,000', '+2M', '22'];

const team = [
  { name: 'رؤوف أبو زكي', role: 'رئيس التحرير', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop' },
  { name: 'ليلى الحاج', role: 'مديرة التحرير', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop' },
  { name: 'أحمد المنصور', role: 'رئيس قسم الاقتصاد', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop' },
  { name: 'سارة العلي', role: 'رئيسة قسم التكنولوجيا', image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop' },
];

const timelineYears = ['1956', '1975', '2000', '2015', '2024'];
const valuesIcons = [Award, Users, Globe];

export default function AboutPageClient() {
  const { t } = useTranslation();

  const stats = statsValues.map((value, i) => ({
    icon: statsIcons[i],
    value,
    label: t(`pages.about.stats.${i}.label`),
  }));

  const timeline = timelineYears.map((year, i) => ({
    year,
    title: t(`pages.about.timeline.${i}.title`),
    description: t(`pages.about.timeline.${i}.description`),
  }));

  const values = valuesIcons.map((icon, i) => ({
    icon,
    title: t(`pages.about.valuesList.${i}.title`),
    desc: t(`pages.about.valuesList.${i}.desc`),
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
                {t('pages.about.title')}
              </h1>
              <p className="text-xl text-white/80 leading-relaxed">
                {t('pages.about.heroSubtitle')}
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

        {/* Mission & Vision */}
        <section className="py-20">
          <div className="container-luxury">
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-lg"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center mb-6">
                  <Target className="text-white" size={32} />
                </div>
                <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                  {t('pages.about.mission')}
                </h2>
                <p className="text-charcoal leading-relaxed">
                  {t('pages.about.missionBody')}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-lg"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-navy to-navy-light flex items-center justify-center mb-6">
                  <Eye className="text-white" size={32} />
                </div>
                <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                  {t('pages.about.vision')}
                </h2>
                <p className="text-charcoal leading-relaxed">
                  {t('pages.about.visionBody')}
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-20 bg-navy text-white">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold mb-4 text-white">
                {t('pages.about.history')}
              </h2>
              <p className="text-white/70">
                {t('pages.about.historySubtitle')}
              </p>
            </motion.div>

            <div className="relative">
              {/* Line */}
              <div className="absolute top-0 bottom-0 right-1/2 w-px bg-gold/30 hidden md:block" />

              <div className="space-y-12">
                {timeline.map((item, index) => (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-8 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
                  >
                    <div className={`flex-1 ${index % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                        <span className="text-gold font-[family-name:var(--font-display)] font-bold text-2xl">
                          {item.year}
                        </span>
                        <h3 className="text-xl font-[family-name:var(--font-display)] font-bold mt-2 mb-2 text-white">
                          {item.title}
                        </h3>
                        <p className="text-white/70">{item.description}</p>
                      </div>
                    </div>
                    <div className="hidden md:flex w-4 h-4 rounded-full bg-gold flex-shrink-0 relative z-10" />
                    <div className="flex-1 hidden md:block" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                {t('pages.team.title')}
              </h2>
              <p className="text-slate">
                {t('pages.about.teamSubtitle')}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-4 border-gold/20">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg">
                    {member.name}
                  </h3>
                  <p className="text-slate text-sm">{member.role}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-ivory">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                {t('pages.about.values')}
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="text-gold" size={28} />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-xl mb-2">
                    {value.title}
                  </h3>
                  <p className="text-slate">{value.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
