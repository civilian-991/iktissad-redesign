'use client';

import { motion } from 'motion/react';
import { BookOpen, Eye, ArrowLeft, Sparkles } from 'lucide-react';

const latestIssue = {
  id: 'AR0542',
  title: 'العدد 542',
  subtitle: 'يناير 2026',
  cover: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=560&fit=crop',
  pages: 84,
  views: 12500,
  highlights: [
    'توقعات الاقتصاد العربي 2026',
    'مقابلة حصرية مع وزير المالية السعودي',
    'ملف خاص: مستقبل التقنية المالية'
  ]
};

const recentIssues = [
  {
    id: 'AR0541',
    title: 'العدد 541',
    subtitle: 'ديسمبر 2025',
    cover: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=560&fit=crop',
  },
  {
    id: 'AR0540',
    title: 'العدد 540',
    subtitle: 'نوفمبر 2025',
    cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=560&fit=crop',
  },
  {
    id: 'AR0539',
    title: 'العدد 539',
    subtitle: 'أكتوبر 2025',
    cover: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=560&fit=crop',
  },
];

export default function FeaturedMagazine() {
  return (
    <section className="py-20 bg-cream relative overflow-hidden">
      {/* Subtle Pattern */}
      <div className="absolute inset-0 pattern-grid opacity-30" />

      {/* Decorative Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />

      <div className="container-editorial relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-12"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-obsidian flex items-center justify-center">
              <BookOpen className="text-gold" size={28} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-[family-name:var(--font-display)] font-bold text-obsidian">
                مجلة الإقتصاد والأعمال
              </h2>
              <p className="text-graphite">أكثر من 65 عاماً من التميز في الصحافة الاقتصادية</p>
            </div>
          </div>
          <a
            href="/magazine"
            className="hidden md:flex items-center gap-2 text-gold hover:text-gold-dark transition-colors font-[family-name:var(--font-display)] font-semibold"
          >
            <span>جميع الأعداد</span>
            <ArrowLeft size={18} />
          </a>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Featured Latest Issue */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <div className="bg-white border border-sand p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="text-gold" size={20} />
                <span className="text-gold font-[family-name:var(--font-display)] font-semibold">
                  العدد الأخير
                </span>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                {/* Cover */}
                <motion.a
                  href={`/magazine/${latestIssue.id}/browse`}
                  whileHover={{ scale: 1.02 }}
                  className="relative group flex-shrink-0"
                >
                  <div className="absolute inset-0 bg-gold/30 blur-2xl rounded-lg opacity-50 group-hover:opacity-70 transition-opacity" />
                  <img
                    src={latestIssue.cover}
                    alt={latestIssue.title}
                    className="relative w-48 md:w-56 h-64 md:h-72 object-cover shadow-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0077cc]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                    <span className="px-4 py-2 bg-gold text-obsidian font-[family-name:var(--font-display)] font-bold text-sm flex items-center gap-2">
                      <BookOpen size={16} />
                      تصفح الآن
                    </span>
                  </div>
                </motion.a>

                {/* Info */}
                <div className="flex-1">
                  <span className="text-gold font-[family-name:var(--font-display)]">
                    {latestIssue.subtitle}
                  </span>
                  <h3 className="text-xl md:text-2xl font-[family-name:var(--font-display)] font-bold text-obsidian mt-1 mb-4">
                    {latestIssue.title}
                  </h3>

                  <div className="flex items-center gap-6 mb-6 text-graphite text-sm">
                    <span className="flex items-center gap-2">
                      <BookOpen size={16} />
                      {latestIssue.pages} صفحة
                    </span>
                    <span className="flex items-center gap-2">
                      <Eye size={16} />
                      {latestIssue.views.toLocaleString()} قراءة
                    </span>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-charcoal font-[family-name:var(--font-display)] font-semibold mb-3 text-sm">
                      في هذا العدد:
                    </h4>
                    <ul className="space-y-2">
                      {latestIssue.highlights.map((highlight, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-3 text-charcoal"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                          {highlight}
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <a
                      href={`/magazine/${latestIssue.id}/browse`}
                      className="flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-[family-name:var(--font-display)] font-bold hover:bg-gold-dark transition-colors"
                    >
                      <BookOpen size={18} />
                      تصفح العدد
                    </a>
                    <a
                      href="/magazine"
                      className="flex items-center gap-2 px-6 py-3 border border-obsidian text-obsidian font-[family-name:var(--font-display)] font-semibold hover:bg-obsidian hover:text-white transition-colors"
                    >
                      أرشيف المجلة
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recent Issues */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h4 className="text-obsidian font-[family-name:var(--font-display)] font-semibold mb-4">
              أعداد سابقة
            </h4>

            {recentIssues.map((issue, index) => (
              <motion.a
                key={issue.id}
                href={`/magazine/${issue.id}/browse`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: -5 }}
                className="flex items-center gap-4 p-3 bg-white border border-sand hover:border-gold/50 transition-all group"
              >
                <img
                  src={issue.cover}
                  alt={issue.title}
                  className="w-16 h-20 object-cover shadow-lg"
                />
                <div className="flex-1">
                  <h5 className="font-[family-name:var(--font-display)] font-bold text-obsidian group-hover:text-gold transition-colors">
                    {issue.title}
                  </h5>
                  <p className="text-graphite text-sm">{issue.subtitle}</p>
                </div>
                <ArrowLeft size={18} className="text-sand group-hover:text-gold transition-colors" />
              </motion.a>
            ))}

            <a
              href="/magazine"
              className="block text-center py-3 text-gold hover:text-gold-dark font-[family-name:var(--font-display)] font-semibold transition-colors"
            >
              عرض جميع الأعداد
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
