'use client';

import { motion } from 'motion/react';
import { Target, Eye, Award, Users, Newspaper, Globe, Calendar } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const stats = [
  { icon: Calendar, value: '1956', label: 'سنة التأسيس' },
  { icon: Newspaper, value: '+50,000', label: 'مقال منشور' },
  { icon: Users, value: '+2M', label: 'قارئ شهرياً' },
  { icon: Globe, value: '22', label: 'دولة نغطيها' },
];

const team = [
  { name: 'رؤوف أبو زكي', role: 'رئيس التحرير', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop' },
  { name: 'ليلى الحاج', role: 'مديرة التحرير', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop' },
  { name: 'أحمد المنصور', role: 'رئيس قسم الاقتصاد', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop' },
  { name: 'سارة العلي', role: 'رئيسة قسم التكنولوجيا', image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop' },
];

const timeline = [
  { year: '1956', title: 'تأسيس المجلة', description: 'إطلاق أول عدد من مجلة الإقتصاد والأعمال في بيروت' },
  { year: '1975', title: 'التوسع الإقليمي', description: 'افتتاح مكاتب في دبي والرياض والقاهرة' },
  { year: '2000', title: 'الانطلاقة الرقمية', description: 'إطلاق الموقع الإلكتروني iktissadonline.com' },
  { year: '2015', title: 'التحول الرقمي', description: 'إعادة هيكلة شاملة والتركيز على المحتوى الرقمي' },
  { year: '2024', title: 'الريادة المستمرة', description: 'تجاوز 2 مليون قارئ شهرياً' },
];

export default function AboutPage() {
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
                من نحن
              </h1>
              <p className="text-xl text-white/80 leading-relaxed">
                منذ عام 1956، نقدم للقارئ العربي أفضل التحليلات الاقتصادية والمالية، لنكون المصدر الأول والأكثر موثوقية للأخبار الاقتصادية في العالم العربي
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
                  key={stat.label}
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
                  مهمتنا
                </h2>
                <p className="text-charcoal leading-relaxed">
                  نسعى لتقديم محتوى اقتصادي ومالي عالي الجودة يساعد القراء والمستثمرين وصناع القرار في فهم الأسواق واتخاذ قرارات مدروسة. نلتزم بأعلى معايير المهنية والدقة والموضوعية في كل ما ننشره.
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
                  رؤيتنا
                </h2>
                <p className="text-charcoal leading-relaxed">
                  أن نكون المنصة الرائدة والأكثر تأثيراً في الإعلام الاقتصادي العربي، ومصدراً موثوقاً للمعلومات والتحليلات التي تشكل فهم العالم العربي للاقتصاد والأعمال.
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
                مسيرتنا
              </h2>
              <p className="text-white/70">
                أكثر من 65 عاماً من التميز في الإعلام الاقتصادي
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
                فريق العمل
              </h2>
              <p className="text-slate">
                نخبة من الصحفيين والمحللين الاقتصاديين
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
                قيمنا
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Award, title: 'المصداقية', desc: 'نلتزم بأعلى معايير الدقة والموضوعية' },
                { icon: Users, title: 'القارئ أولاً', desc: 'نضع احتياجات قرائنا في صميم كل ما نقدمه' },
                { icon: Globe, title: 'الشمولية', desc: 'نغطي الأخبار من جميع أنحاء العالم العربي' },
              ].map((value, index) => (
                <motion.div
                  key={value.title}
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
