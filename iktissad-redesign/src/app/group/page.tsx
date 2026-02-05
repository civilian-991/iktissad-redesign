'use client';

import { motion } from 'motion/react';
import { ExternalLink, BookOpen, Building, Users, Award } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const publications = [
  {
    id: 'magazine',
    name: 'مجلة الإقتصاد والأعمال',
    description: 'المجلة الاقتصادية الأولى في العالم العربي منذ 1956',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=400&fit=crop',
    url: '#',
    stats: { issues: '+800', years: '68', readers: '+500K' }
  },
  {
    id: 'arab-markets',
    name: 'مجلة أسواق العرب',
    description: 'تغطية شاملة لأسواق المال والبورصات العربية',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop',
    url: '#',
    stats: { issues: '+200', years: '25', readers: '+300K' }
  },
  {
    id: 'banks',
    name: 'مجلة البنوك والمصارف',
    description: 'المرجع الأول للقطاع المصرفي العربي',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop',
    url: '#',
    stats: { issues: '+150', years: '20', readers: '+200K' }
  },
  {
    id: 'leaders',
    name: 'دليل قادة الأعمال',
    description: 'الموسوعة السنوية لقادة الأعمال في العالم العربي',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=400&fit=crop',
    url: '#',
    stats: { profiles: '+5000', years: '15', countries: '22' }
  },
];

const services = [
  {
    icon: BookOpen,
    title: 'النشر والتوزيع',
    description: 'نصل إلى القراء في 22 دولة عربية عبر شبكة توزيع واسعة'
  },
  {
    icon: Building,
    title: 'المؤتمرات والفعاليات',
    description: 'ننظم أكثر من 20 مؤتمراً وفعالية اقتصادية سنوياً'
  },
  {
    icon: Users,
    title: 'الاستشارات الإعلامية',
    description: 'نقدم خدمات استشارية في مجال الإعلام الاقتصادي'
  },
  {
    icon: Award,
    title: 'الجوائز والتكريمات',
    description: 'نمنح جوائز سنوية لأفضل الشركات والقادة في المنطقة'
  },
];

const partners = [
  'صندوق النقد الدولي',
  'البنك الدولي',
  'جامعة الدول العربية',
  'مجلس التعاون الخليجي',
  'الاتحاد العام لغرف التجارة العربية',
  'اتحاد المصارف العربية',
];

export default function GroupPage() {
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
                مجموعة الإقتصاد والأعمال
              </h1>
              <p className="text-xl text-white/80 leading-relaxed">
                أكبر مجموعة إعلامية متخصصة في الشأن الاقتصادي والمالي في العالم العربي
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-gold py-8 -mt-1">
          <div className="container-luxury">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: '68', label: 'عاماً من التميز' },
                { value: '4', label: 'إصدارات رئيسية' },
                { value: '22', label: 'دولة نغطيها' },
                { value: '+2M', label: 'قارئ شهرياً' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
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
                إصداراتنا
              </h2>
              <p className="text-slate max-w-2xl mx-auto">
                مجموعة متكاملة من المنشورات المتخصصة التي تغطي كافة جوانب الاقتصاد والأعمال
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
                    <div className="absolute bottom-4 right-4 left-4">
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
                            {key === 'issues' ? 'عدد' : key === 'years' ? 'سنة' : key === 'readers' ? 'قارئ' : key === 'profiles' ? 'شخصية' : key === 'countries' ? 'دولة' : key}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-end text-gold group-hover:gap-3 transition-all">
                      <span className="font-[family-name:var(--font-display)] font-semibold text-sm">
                        زيارة الموقع
                      </span>
                      <ExternalLink size={16} className="mr-1" />
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
                خدماتنا
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
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
                شركاؤنا
              </h2>
              <p className="text-white/70">
                نتعاون مع أبرز المؤسسات الاقتصادية والمالية في المنطقة
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {partners.map((partner, index) => (
                <motion.div
                  key={partner}
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
                هل ترغب في الشراكة معنا؟
              </h2>
              <p className="text-white/80 mb-8 max-w-2xl mx-auto">
                نرحب بالتعاون مع المؤسسات والشركات الراغبة في الوصول إلى جمهورنا المتميز
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gold rounded-lg font-[family-name:var(--font-display)] font-bold hover:bg-navy hover:text-white transition-colors"
              >
                تواصل معنا
              </a>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
