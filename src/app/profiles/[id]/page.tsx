'use client';

import { motion } from 'motion/react';
import { Quote, MapPin, Briefcase, Award, ArrowUpLeft, Clock, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const profile = {
  id: 1,
  name: 'ياسر الرميان',
  title: 'محافظ صندوق الاستثمارات العامة',
  image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=1000&fit=crop',
  coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&h=600&fit=crop',
  quote: 'نهدف إلى تنويع مصادر الدخل وخلق فرص استثمارية مستدامة للأجيال القادمة',
  category: 'قادة الأعمال',
  country: 'السعودية',
  bio: `ياسر بن عثمان الرميان، محافظ صندوق الاستثمارات العامة السعودي منذ عام 2015. يُعد الرميان أحد أبرز الشخصيات الاقتصادية في المملكة العربية السعودية والعالم العربي.

قاد الرميان عملية تحويل صندوق الاستثمارات العامة من صندوق سيادي تقليدي إلى واحد من أكبر وأكثر صناديق الثروة السيادية نشاطاً في العالم، حيث تجاوزت أصوله 700 مليار دولار.

تحت قيادته، استثمر الصندوق في مجموعة متنوعة من القطاعات بما في ذلك التكنولوجيا والترفيه والرياضة والسياحة، مما ساهم في تنويع الاقتصاد السعودي بعيداً عن النفط.`,
  achievements: [
    'زيادة أصول صندوق الاستثمارات العامة من 160 مليار إلى أكثر من 700 مليار دولار',
    'قيادة استثمارات استراتيجية في شركات عالمية كبرى',
    'إطلاق مشاريع عملاقة مثل نيوم والبحر الأحمر',
    'تعزيز مكانة السعودية كوجهة استثمارية عالمية'
  ],
  positions: [
    { title: 'محافظ صندوق الاستثمارات العامة', period: '2015 - الحاضر' },
    { title: 'رئيس مجلس إدارة أرامكو السعودية', period: '2020 - الحاضر' },
    { title: 'عضو مجلس الشؤون الاقتصادية والتنمية', period: '2016 - الحاضر' },
  ]
};

const relatedArticles = [
  { id: 1, title: 'صندوق الاستثمارات العامة يستحوذ على حصة في شركة عالمية', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop', date: '7 يناير 2026' },
  { id: 2, title: 'الرميان: نستهدف أن يصبح الصندوق الأكبر في العالم', image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop', date: '5 يناير 2026' },
  { id: 3, title: 'استثمارات سعودية جديدة في قطاع التكنولوجيا', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop', date: '3 يناير 2026' },
];

export default function ProfileDetailPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative h-[40vh] overflow-hidden">
          <img
            src={profile.coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/60 to-transparent" />
        </section>

        {/* Profile Card */}
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative -mt-32 mb-12"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col md:flex-row gap-8">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-white">
                  <img
                    src={profile.image}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-gold text-white text-xs font-[family-name:var(--font-display)] font-semibold rounded-full">
                    {profile.category}
                  </span>
                  <span className="flex items-center gap-1 text-slate text-sm">
                    <MapPin size={14} />
                    {profile.country}
                  </span>
                </div>

                <h1 className="text-3xl lg:text-4xl font-[family-name:var(--font-display)] font-black text-navy mb-2">
                  {profile.name}
                </h1>
                <p className="text-lg text-slate mb-4">
                  {profile.title}
                </p>

                {/* Quote */}
                <div className="bg-ivory rounded-xl p-4 border-r-4 border-gold">
                  <Quote size={20} className="text-gold mb-2" />
                  <p className="text-navy italic font-[family-name:var(--font-display)]">
                    "{profile.quote}"
                  </p>
                </div>

                {/* Share */}
                <div className="flex items-center gap-4 mt-6">
                  <span className="text-sm text-slate flex items-center gap-2">
                    <Share2 size={16} />
                    مشاركة:
                  </span>
                  <button className="w-8 h-8 rounded-full bg-[#1877f2] text-white flex items-center justify-center hover:opacity-80">
                    <Facebook size={14} />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-[#1da1f2] text-white flex items-center justify-center hover:opacity-80">
                    <Twitter size={14} />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-[#0a66c2] text-white flex items-center justify-center hover:opacity-80">
                    <Linkedin size={14} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <section className="pb-16">
          <div className="container-luxury">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-10">
                {/* Bio */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy mb-4 flex items-center gap-2">
                    <Briefcase size={24} className="text-gold" />
                    نبذة
                  </h2>
                  <div className="prose prose-lg max-w-none text-charcoal leading-relaxed whitespace-pre-line">
                    {profile.bio}
                  </div>
                </motion.div>

                {/* Achievements */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy mb-4 flex items-center gap-2">
                    <Award size={24} className="text-gold" />
                    إنجازات بارزة
                  </h2>
                  <ul className="space-y-3">
                    {profile.achievements.map((achievement, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <span className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 mt-1 text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="text-charcoal">{achievement}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>

                {/* Positions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                    المناصب
                  </h2>
                  <div className="space-y-4">
                    {profile.positions.map((position, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-gold"
                      >
                        <h3 className="font-[family-name:var(--font-display)] font-semibold text-navy">
                          {position.title}
                        </h3>
                        <span className="text-sm text-slate">{position.period}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-6 sticky top-24"
                >
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-xl text-navy mb-6 pb-4 border-b border-sand">
                    مقالات ذات صلة
                  </h3>
                  <div className="space-y-4">
                    {relatedArticles.map((article) => (
                      <a
                        key={article.id}
                        href={`/news/${article.id}`}
                        className="flex gap-4 group"
                      >
                        <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={article.image}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-[family-name:var(--font-display)] font-semibold text-sm text-navy leading-snug line-clamp-2 group-hover:text-gold transition-colors">
                            {article.title}
                          </h4>
                          <span className="text-xs text-slate mt-1 flex items-center gap-1">
                            <Clock size={10} />
                            {article.date}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>

                  <a
                    href="/profiles"
                    className="flex items-center justify-center gap-2 w-full mt-6 py-3 rounded-lg border-2 border-dashed border-gold/30 text-gold font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/10 transition-colors"
                  >
                    جميع الشخصيات
                    <ArrowUpLeft size={16} />
                  </a>
                </motion.div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
