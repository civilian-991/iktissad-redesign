'use client';

import { motion } from 'motion/react';
import { Linkedin, Twitter, Mail } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const leadership = [
  {
    name: 'رؤوف أبو زكي',
    role: 'رئيس التحرير',
    bio: 'أكثر من 30 عاماً من الخبرة في الصحافة الاقتصادية. قاد تحولات كبرى في المجلة ويُعد من أبرز الأصوات الاقتصادية في العالم العربي.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    social: { linkedin: '#', twitter: '#', email: 'editor@iktissad.com' }
  },
  {
    name: 'ليلى الحاج',
    role: 'مديرة التحرير',
    bio: 'خبرة واسعة في إدارة الفرق الصحفية وتطوير المحتوى الرقمي. تشرف على جودة المحتوى وسياسات التحرير.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    social: { linkedin: '#', twitter: '#', email: 'managing@iktissad.com' }
  }
];

const editors = [
  {
    name: 'أحمد المنصور',
    role: 'رئيس قسم الاقتصاد',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop'
  },
  {
    name: 'سارة العلي',
    role: 'رئيسة قسم التكنولوجيا',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop'
  },
  {
    name: 'محمد الخالدي',
    role: 'رئيس قسم الأسواق',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop'
  },
  {
    name: 'نور الدين',
    role: 'رئيس قسم الشركات',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop'
  },
  {
    name: 'فاطمة الزهراء',
    role: 'رئيسة قسم الطاقة',
    image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=300&h=300&fit=crop'
  },
  {
    name: 'عمر الشريف',
    role: 'رئيس قسم الرأي',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop'
  }
];

const correspondents = [
  { name: 'خالد العتيبي', location: 'الرياض', country: 'السعودية' },
  { name: 'مريم الفلاسي', location: 'دبي', country: 'الإمارات' },
  { name: 'يوسف الكويتي', location: 'الكويت', country: 'الكويت' },
  { name: 'هدى المصري', location: 'القاهرة', country: 'مصر' },
  { name: 'سامي الأردني', location: 'عمّان', country: 'الأردن' },
  { name: 'ريم البحريني', location: 'المنامة', country: 'البحرين' },
];

export default function TeamPage() {
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
                فريق العمل
              </h1>
              <p className="text-xl text-white/80 leading-relaxed">
                نخبة من الصحفيين والمحللين الاقتصاديين يعملون على مدار الساعة لتقديم أفضل المحتوى
              </p>
            </motion.div>
          </div>
        </section>

        {/* Leadership */}
        <section className="py-20">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                القيادة التحريرية
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {leadership.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-8 shadow-lg"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-gold/20">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-2xl mb-1">
                      {member.name}
                    </h3>
                    <p className="text-gold font-[family-name:var(--font-display)] font-semibold mb-4">
                      {member.role}
                    </p>
                    <p className="text-charcoal text-sm leading-relaxed mb-6">
                      {member.bio}
                    </p>
                    <div className="flex items-center gap-4">
                      <a href={member.social.linkedin} className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy hover:bg-gold hover:text-white transition-colors">
                        <Linkedin size={18} />
                      </a>
                      <a href={member.social.twitter} className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy hover:bg-gold hover:text-white transition-colors">
                        <Twitter size={18} />
                      </a>
                      <a href={`mailto:${member.social.email}`} className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy hover:bg-gold hover:text-white transition-colors">
                        <Mail size={18} />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section Editors */}
        <section className="py-20 bg-ivory">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                رؤساء الأقسام
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {editors.map((editor, index) => (
                <motion.div
                  key={editor.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl p-6 text-center shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 border-4 border-gold/20">
                    <img
                      src={editor.image}
                      alt={editor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg">
                    {editor.name}
                  </h3>
                  <p className="text-slate text-sm">{editor.role}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Correspondents */}
        <section className="py-20">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                المراسلون
              </h2>
              <p className="text-slate">
                شبكة واسعة من المراسلين في جميع أنحاء العالم العربي
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {correspondents.map((correspondent, index) => (
                <motion.div
                  key={correspondent.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-lg p-5 shadow-sm border border-sand"
                >
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy">
                    {correspondent.name}
                  </h3>
                  <p className="text-slate text-sm">
                    {correspondent.location}، {correspondent.country}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Join Us CTA */}
        <section className="py-20 bg-navy text-white">
          <div className="container-luxury text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold mb-4 text-white">
                انضم إلى فريقنا
              </h2>
              <p className="text-white/70 mb-8 max-w-2xl mx-auto">
                نبحث دائماً عن صحفيين ومحررين موهوبين للانضمام إلى فريقنا
              </p>
              <a href="/contact" className="btn-gold inline-block">
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
