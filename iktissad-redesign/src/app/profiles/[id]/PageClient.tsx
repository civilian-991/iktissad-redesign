'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Quote, MapPin, Briefcase, Award, ArrowUpLeft, Clock, Share2, Facebook, Twitter, Linkedin, BookOpen, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

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


export default function ProfileDetailPageClient() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const authorId = params?.id;

  // F8.2 — Load articles by this author from the real API
  const { data: articlesData, isLoading: articlesLoading } = useSWR<ApiResponse<Article[]>>(
    authorId ? `/api/articles?authorId=${authorId}&status=published&pageSize=10` : null,
    swrFetcher
  );
  const authorArticles = articlesData?.data ?? [];

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
                <div className="bg-ivory rounded-xl p-5 border border-sand">
                  <Quote size={20} className="text-gold mb-2" />
                  <p className="text-navy italic font-[family-name:var(--font-display)]">
                    &ldquo;{profile.quote}&rdquo;
                  </p>
                </div>

                {/* Share */}
                <div className="flex items-center gap-4 mt-6">
                  <span className="text-sm text-slate flex items-center gap-2">
                    <Share2 size={16} />
                    {t('components.share.title')}:
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
                    {t('pages.profiles.description')}
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
                        className="bg-white rounded-xl p-4 shadow-sm border border-sand"
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

              {/* Sidebar — F8.2: real articles by this author */}
              <aside className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-6 sticky top-[calc(var(--header-offset-public)+1rem)]"
                >
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-xl text-navy mb-6 pb-4 border-b border-sand">
                    {t('profile.articles_by')}
                  </h3>

                  {articlesLoading && (
                    <div className="flex justify-center py-8">
                      <Loader2 size={22} className="animate-spin text-gold/60" />
                    </div>
                  )}

                  {!articlesLoading && authorArticles.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <BookOpen size={24} className="text-charcoal/20" />
                      <p className="text-sm text-charcoal/40 font-[family-name:var(--font-display)]">
                        لا توجد مقالات منشورة
                      </p>
                    </div>
                  )}

                  {!articlesLoading && authorArticles.length > 0 && (
                    <div className="space-y-4">
                      {authorArticles.map((article) => (
                        <a
                          key={article.id}
                          href={`/${article.slug ?? article.id}`}
                          className="flex gap-4 group"
                        >
                          {article.featuredImage ? (
                            <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={article.featuredImage}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-16 rounded-lg bg-sand/30 flex items-center justify-center flex-shrink-0">
                              <BookOpen size={16} className="text-charcoal/20" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-[family-name:var(--font-display)] font-semibold text-sm text-navy leading-snug line-clamp-2 group-hover:text-gold transition-colors">
                              {article.title}
                            </h4>
                            {article.publishedAt && (
                              <span className="text-xs text-slate mt-1 flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  <Link
                    href="/profiles"
                    className="flex items-center justify-center gap-2 w-full mt-6 py-3 rounded-lg border-2 border-dashed border-gold/30 text-gold font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/10 transition-colors"
                  >
                    {t('pages.profiles.allProfiles')}
                    <ArrowUpLeft size={16} />
                  </Link>
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
