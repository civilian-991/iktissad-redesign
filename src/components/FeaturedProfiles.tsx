'use client';

import { motion } from 'motion/react';
import { Quote, ArrowUpLeft } from 'lucide-react';

const profiles = [
  {
    id: 1,
    name: 'محمد بن سلمان آل سعود',
    title: 'ولي العهد السعودي',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop',
    quote: 'رؤية 2030 ستجعل السعودية نموذجاً رائداً في العالم على جميع الأصعدة',
    category: 'قادة'
  },
  {
    id: 2,
    name: 'ياسر الرميان',
    title: 'محافظ صندوق الاستثمارات العامة',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&fit=crop',
    quote: 'نهدف إلى تنويع مصادر الدخل وخلق فرص استثمارية مستدامة',
    category: 'قادة الأعمال'
  },
  {
    id: 3,
    name: 'لطيفة الشعلان',
    title: 'عضو مجلس إدارة أرامكو',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=500&fit=crop',
    quote: 'المرأة السعودية أصبحت شريكاً أساسياً في بناء اقتصاد المملكة',
    category: 'رائدات أعمال'
  },
  {
    id: 4,
    name: 'عبدالله الغفيص',
    title: 'الرئيس التنفيذي لـ stc',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop',
    quote: 'التحول الرقمي هو مستقبل الاقتصاد العربي',
    category: 'قادة التقنية'
  }
];

export default function FeaturedProfiles() {
  return (
    <section className="py-20 bg-cream relative overflow-hidden">
      {/* Decorative Pattern */}
      <div className="absolute inset-0 geometric-pattern opacity-30" />

      <div className="container-luxury relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
        >
          <div>
            <span className="text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider">
              شخصيات مؤثرة
            </span>
            <h2 className="text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold text-navy mt-2">
              بروفايل
            </h2>
            <p className="text-slate mt-2 max-w-lg">
              قادة الأعمال والشخصيات المؤثرة في عالم الاقتصاد والمال العربي
            </p>
          </div>
          <a
            href="/profiles"
            className="btn-navy flex items-center gap-2 self-start"
          >
            <span>جميع الشخصيات</span>
            <ArrowUpLeft size={18} />
          </a>
        </motion.div>

        {/* Profiles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {profiles.map((profile, index) => (
            <motion.a
              key={profile.id}
              href={`/profiles/${profile.id}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              {/* Card */}
              <div className="relative bg-white rounded-2xl overflow-hidden shadow-lg">
                {/* Image */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={profile.image}
                    alt={profile.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-light/60 via-transparent to-transparent" />

                  {/* Category Badge */}
                  <span className="absolute top-4 right-4 px-3 py-1 bg-gold text-white text-xs font-[family-name:var(--font-display)] font-semibold rounded-full">
                    {profile.category}
                  </span>

                  {/* Quote Icon */}
                  <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Quote size={18} className="text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 relative">
                  {/* Gold Accent Line */}
                  <div className="absolute top-0 right-5 w-12 h-1 bg-gradient-to-l from-gold to-transparent -translate-y-0.5" />

                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg mb-1 group-hover:text-gold transition-colors duration-300">
                    {profile.name}
                  </h3>
                  <p className="text-sm text-slate mb-3">
                    {profile.title}
                  </p>

                  {/* Quote */}
                  <p className="text-xs text-charcoal leading-relaxed line-clamp-2 italic">
                    "{profile.quote}"
                  </p>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-gold rounded-2xl transition-colors duration-300 pointer-events-none" />
              </div>

              {/* Decorative Shadow */}
              <div className="absolute -bottom-3 left-3 right-3 h-6 bg-navy/10 rounded-2xl -z-10 blur-md" />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
