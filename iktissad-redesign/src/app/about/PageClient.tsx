'use client';

import { motion } from 'motion/react';
import { Globe, Newspaper, Mic2, Layers, ExternalLink } from 'lucide-react';
import NextImage from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { AboutStats } from '@/lib/site-settings';

// Editorial copy below is intentionally hardcoded — it's brand-voice manifesto
// content, not routine data. Conference stats are pulled from site_settings
// (about_stats key) so the numbers can be updated without a deploy.

const sections = [
  {
    id: 'website',
    icon: Globe,
    tagline: 'ما لا تراه في الخبر',
    title: 'الموقع',
    intro: 'في قلب هذه الرؤية، يأتي موقع الاقتصاد والأعمال الإلكتروني.',
    body: [
      'ليس منصة تلاحق الأخبار، بل مساحة تكشف ما وراءها.',
      'هنا، لا نكتب عمّا يُقال فقط، إنما عمّا لا يُقال.',
      'نقرأ ما بين السطور، ونربط بين الأحداث، ونفكك الأرقام لنقدّم صورة أوضح.',
    ],
    highlight:
      'نغطي الأسواق المالية، الشركات، السياسات الاقتصادية، والتحولات الكبرى في المنطقة والعالم. لكن كل خبر بالنسبة لنا هو نقطة بداية. نسأل: ماذا يعني هذا؟ ما الذي تغيّر فعلاً؟ وما الذي يمكن أن يحدث لاحقاً؟',
    closing: 'لأن من يرى أكثر… يقرر أفضل.',
  },
  {
    id: 'magazine',
    icon: Newspaper,
    tagline: 'فهم أعمق… أثر أطول',
    title: 'المجلة',
    intro: 'قبل أن تتسارع المنصات الرقمية، كانت مجلة الاقتصاد والأعمال.',
    body: [
      'ومنذ ذلك الحين، حافظت على موقعها كمرجع اقتصادي راسخ في العالم العربي.',
      'في زمن السرعة، نمنح القضايا ما تستحقه من عمق.',
      'وفي زمن الاختصار، نعيد بناء الصورة كاملة.',
    ],
    highlight:
      'نقدّم تحليلات استراتيجية، دراسات قطاعية، وبروفايلات معمّقة لقيادات ترسم ملامح الاقتصاد. محتوى يُقرأ اليوم… ويُعاد إليه لاحقاً.',
    closing: 'هنا يتحول الفهم إلى معرفة. والمعرفة إلى رؤية.',
  },
  {
    id: 'conferences',
    icon: Mic2,
    tagline: 'حيث يلتقي القرار بمن يصنعه',
    title: 'المؤتمرات',
    intro: 'إذا كانت الكلمة تُنتج الفهم، فإن اللقاء المباشر يصنع التأثير.',
    body: [
      'على مدى أكثر من ثلاثة عقود، تحولت مؤتمرات الاقتصاد والأعمال إلى منصات تجمع من يصنع القرار، لا من يراقبه فقط.',
      'أكثر من 350 مؤتمراً في 25 دولة، شارك فيها رؤساء دول وحكومات ووزراء ومحافظو مصارف مركزية ورؤساء شركات.',
    ],
    highlight:
      'لم تكن مجرد فعاليات، بل منصات تُناقش فيها الرؤى والسياسات، تُبنى فيها العلاقات وتُعرض فيها الفرص.',
    question: 'نبدأ دائماً من سؤال واضح: ماذا تريد هذه الجهة أن تقول، ولمن، ولماذا الآن؟',
    closing: 'ومن هنا، نبني المنصة التي تُحدث الفرق.',
  },
];

// Default conference stats used when site_settings has no override.
const DEFAULT_CONFERENCE_STATS = [
  { value: '+350', label: 'مؤتمراً' },
  { value: '25', label: 'دولة' },
  { value: '+50', label: 'عاماً من الخبرة' },
];

interface AboutPageClientProps {
  aboutStats?: AboutStats | null;
}

export default function AboutPageClient({ aboutStats }: AboutPageClientProps) {
  const conferenceStats = aboutStats?.conferenceStats?.length
    ? aboutStats.conferenceStats.map(s => ({ value: s.value, label: s.labelAr }))
    : DEFAULT_CONFERENCE_STATS;
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream" dir="rtl">

        {/* ── Hero ── */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-28 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-2xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-3xl mx-auto text-center"
            >
              <p className="text-gold text-sm font-semibold tracking-widest uppercase mb-4">
                من نحن
              </p>
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mb-6 leading-tight">
                الاقتصاد والأعمال
                <span className="block text-gold mt-2">من الفهم إلى القرار</span>
              </h1>
            </motion.div>

            {/* Intro text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="max-w-3xl mx-auto mt-10 bg-white/8 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
            >
              <p className="text-white/85 text-lg leading-relaxed mb-6">
                في عالم تتسارع فيه الأحداث وتتشابك فيه المصالح، لم تعد المشكلة في نقص المعلومات، بل في القدرة على فهمها. لم يعد كافياً أن تعرف ما حدث، بل أن تفهم لماذا حدث، وماذا يعني، وإلى أين يقود.
              </p>
              <p className="text-white/85 text-lg leading-relaxed mb-8">
                في هذه المساحة بين الخبر والقرار، تعمل الاقتصاد والأعمال منذ عام 1977.
              </p>
              <div className="pt-6 mt-6 border-t border-gold/40 space-y-2">
                <p className="text-white font-semibold text-2xl tracking-tight">نحن لا ننقل الخبر.</p>
                <p className="text-white/90 text-lg">نفسّره. نضعه في سياقه. ونستبق اتجاهه.</p>
              </div>
              <p className="text-gold font-[family-name:var(--font-display)] font-bold text-xl mt-6">
                لأن القيمة الحقيقية تبدأ من الفهم… وتنتهي بالقرار.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Three Pillars ── */}
        {sections.map((section, index) => {
          const isEven = index % 2 === 0;
          const Icon = section.icon;
          return (
            <section
              key={section.id}
              className={`py-20 ${isEven ? 'bg-ivory' : 'bg-white'}`}
            >
              <div className="container-luxury">
                <div className="max-w-4xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                  >
                    {/* Section header */}
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Icon className="text-white" size={26} />
                      </div>
                      <div>
                        <p className="text-gold text-sm font-semibold tracking-wide">{section.tagline}</p>
                        <h2 className="text-3xl font-[family-name:var(--font-display)] font-black text-navy">
                          {section.title}
                        </h2>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-l from-transparent via-gold/40 to-transparent mb-8" />

                    {/* Intro */}
                    <p className="text-navy font-semibold text-xl mb-4 leading-relaxed">
                      {section.intro}
                    </p>

                    {/* Body paragraphs */}
                    <div className="space-y-3 mb-6">
                      {section.body.map((para, i) => (
                        <p key={i} className="text-charcoal text-lg leading-relaxed">
                          {para}
                        </p>
                      ))}
                    </div>

                    {/* Highlight box */}
                    <div className="bg-navy/5 border border-navy/10 rounded-xl p-6 mb-6">
                      <p className="text-charcoal leading-relaxed">
                        {section.highlight}
                      </p>
                    </div>

                    {/* Conference stats */}
                    {section.id === 'conferences' && (
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        {conferenceStats.map((stat) => (
                          <div key={stat.label} className="bg-navy rounded-xl p-5 text-center">
                            <div className="text-3xl font-[family-name:var(--font-display)] font-black text-gold mb-1">
                              {stat.value}
                            </div>
                            <div className="text-white/70 text-sm">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Optional question */}
                    {'question' in section && (
                      <p className="text-navy font-semibold text-lg mb-4 leading-relaxed">
                        {section.question}
                      </p>
                    )}

                    {/* Closing tagline */}
                    <p className="text-gold font-[family-name:var(--font-display)] font-bold text-xl">
                      {section.closing}
                    </p>
                  </motion.div>
                </div>
              </div>
            </section>
          );
        })}

        {/* ── Publications ── */}
        <section className="py-20 bg-white">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <div className="mb-10">
                <p className="text-gold text-sm font-semibold tracking-wide mb-1">إصداراتنا</p>
                <h2 className="text-3xl font-[family-name:var(--font-display)] font-black text-navy">
                  منشورات المجموعة
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* مجلة الاقتصاد والأعمال */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0 }}
                  className="group bg-ivory rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="h-44 bg-gradient-to-br from-navy to-navy-light flex items-center justify-center px-8">
                    <div className="relative w-full h-20">
                      <NextImage
                        src="/logo.png"
                        alt="مجلة الاقتصاد والأعمال"
                        fill
                        className="object-contain brightness-0 invert"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg mb-1">
                      مجلة الاقتصاد والأعمال
                    </h3>
                    <p className="text-slate text-sm mb-4 leading-relaxed">
                      المجلة الاقتصادية الأولى في العالم العربي — تحليلات استراتيجية ودراسات قطاعية منذ عام 1977.
                    </p>
                    <Link
                      href="/magazine"
                      className="inline-flex items-center gap-1.5 text-gold text-sm font-semibold hover:gap-2.5 transition-all"
                    >
                      تصفح الأعداد <ExternalLink size={14} />
                    </Link>
                  </div>
                </motion.div>

                {/* الدفاعية */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="group bg-ivory rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="h-44 relative overflow-hidden bg-charcoal">
                    <NextImage
                      src="https://www.defaiya.com/sites/default/files/magazines/defaiya/regular/DR0159/cover.jpg"
                      alt="مجلة الدفاعية"
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 to-transparent" />
                    <div className="absolute bottom-3 right-3 bg-gold text-white text-xs font-bold px-2 py-0.5 rounded">
                      العدد 159
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg mb-1">
                      مجلة الدفاعية
                    </h3>
                    <p className="text-slate text-sm mb-4 leading-relaxed">
                      Arab Defense &amp; Aerospace News — المرجع العربي الأول في أخبار الدفاع والفضاء والأمن الإقليمي.
                    </p>
                    <a
                      href="https://www.defaiya.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-gold text-sm font-semibold hover:gap-2.5 transition-all"
                    >
                      زيارة الموقع <ExternalLink size={14} />
                    </a>
                  </div>
                </motion.div>

                {/* الحسناء */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="group bg-ivory rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="h-44 bg-gradient-to-br from-rose-900 to-rose-700 flex items-center justify-center px-8">
                    <div className="relative w-full h-24">
                      <NextImage
                        src="https://www.iktissadonline.com/sites/default/files/2018-hasnaa-logo-block.jpg"
                        alt="مجلة الحسناء"
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg mb-1">
                      مجلة الحسناء
                    </h3>
                    <p className="text-slate text-sm mb-4 leading-relaxed">
                      مجلة المرأة العربية — موضة، جمال، وأسلوب حياة راقٍ للمرأة العربية المعاصرة.
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── منظومة واحدة — Closing ── */}
        <section className="py-24 bg-navy text-white overflow-hidden relative">
          <div className="absolute inset-0 star-pattern opacity-10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold/8 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="max-w-3xl mx-auto text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center mx-auto mb-8 shadow-xl">
                <Layers className="text-white" size={30} />
              </div>

              <h2 className="text-4xl font-[family-name:var(--font-display)] font-black mb-2">
                منظومة واحدة
              </h2>
              <p className="text-gold font-semibold text-lg mb-10">رؤية متكاملة</p>

              <div className="space-y-4 mb-10 text-right">
                {[
                  { icon: Globe, text: 'موقع يكشف ما لا تراه في الخبر' },
                  { icon: Newspaper, text: 'مجلة تقدم فهماً أعمق… وأثراً أطول' },
                  { icon: Mic2, text: 'مؤتمرات تُصنع فيها العلاقات ويُبنى التأثير' },
                ].map(({ icon: ItemIcon, text }) => (
                  <div key={text} className="flex items-center gap-4 bg-white/8 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/10">
                    <ItemIcon className="text-gold flex-shrink-0" size={22} />
                    <span className="text-white/90 text-lg">{text}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/15 pt-8">
                <p className="text-white/70 text-sm mb-2">كل ذلك ضمن رؤية واحدة</p>
                <p className="text-3xl font-[family-name:var(--font-display)] font-black text-gold">
                  من الفهم إلى القرار.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
