'use client';

import { motion } from 'motion/react';
import { Play, Eye, ArrowUpLeft } from 'lucide-react';

const videos = [
  {
    id: 1,
    title: 'تحليل: تأثير فتح السوق السعودي على الاستثمارات الأجنبية',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=450&fit=crop',
    duration: '12:45',
    views: '45K',
    category: 'تحليلات',
    featured: true
  },
  {
    id: 2,
    title: 'مقابلة حصرية مع وزير الاقتصاد الإماراتي',
    thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=450&fit=crop',
    duration: '18:30',
    views: '32K',
    category: 'مقابلات',
    featured: true
  },
  {
    id: 3,
    title: 'جولة داخل مصنع السيارات الكهربائية في السعودية',
    thumbnail: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=450&fit=crop',
    duration: '8:20',
    views: '28K',
    category: 'تقارير'
  },
  {
    id: 4,
    title: 'ملخص أسواق الأسبوع: ارتفاعات قياسية في البورصات الخليجية',
    thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=450&fit=crop',
    duration: '6:15',
    views: '52K',
    category: 'أسواق'
  },
  {
    id: 5,
    title: 'كيف تستثمر في العقارات خلال 2026؟',
    thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=450&fit=crop',
    duration: '15:00',
    views: '38K',
    category: 'نصائح'
  },
  {
    id: 6,
    title: 'مستقبل الطاقة المتجددة في الشرق الأوسط',
    thumbnail: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=450&fit=crop',
    duration: '10:45',
    views: '22K',
    category: 'تقارير'
  },
];

export default function VideoSection() {
  const featuredVideos = videos.filter(v => v.featured);
  const regularVideos = videos.filter(v => !v.featured);

  return (
    <section className="py-24 bg-gradient-to-br from-[#002d4f] via-[#003d6b] to-[#002d4f] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #d4af37 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-3xl" />

      <div className="container-editorial relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
        >
          <div>
            <span className="text-[#d4af37] text-sm font-[family-name:var(--font-display)] font-semibold tracking-wider uppercase">
              شاهد الآن
            </span>
            <h2 className="text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold text-[#ffffff] mt-3 mb-4">
              فيديو
            </h2>
            <div className="h-1 w-24 bg-gradient-to-l from-[#d4af37] to-[#cd7f32]" />
          </div>

          <a
            href="/videos"
            className="inline-flex items-center gap-2 text-[#d4af37] hover:text-[#e5c158] transition-colors font-[family-name:var(--font-display)] font-semibold"
          >
            <span>جميع الفيديوهات</span>
            <ArrowUpLeft size={18} />
          </a>
        </motion.div>

        {/* Videos Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Featured Videos - Large */}
          <div className="lg:col-span-8 grid md:grid-cols-2 gap-6">
            {featuredVideos.map((video, index) => (
              <motion.a
                key={video.id}
                href={`/videos/${video.id}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group block"
              >
                <div className="relative aspect-video overflow-hidden bg-[#005B9F]">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-16 h-16 bg-[#d4af37] flex items-center justify-center"
                    >
                      <Play className="text-[#002d4f] fill-[#002d4f]" size={28} />
                    </motion.div>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-3 left-3 bg-black/80 text-[#ffffff] text-xs px-2 py-1 font-[family-name:var(--font-display)]">
                    {video.duration}
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-3 right-3 bg-[#d4af37] text-[#002d4f] text-xs px-2 py-1 font-[family-name:var(--font-display)] font-bold">
                    {video.category}
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-[#ffffff] text-lg leading-relaxed group-hover:text-[#d4af37] transition-colors line-clamp-2">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-[#c8d4e0] text-sm">
                    <span className="flex items-center gap-1">
                      <Eye size={14} />
                      {video.views} مشاهدة
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>

          {/* Regular Videos - Sidebar List */}
          <div className="lg:col-span-4 bg-[#005B9F] border border-[#3d8fd4]">
            <div className="p-4 border-b border-[#3d8fd4]">
              <h3 className="font-[family-name:var(--font-display)] font-bold text-[#ffffff]">
                المزيد من الفيديوهات
              </h3>
            </div>

            <div className="divide-y divide-[#3d8fd4]">
              {regularVideos.map((video, index) => (
                <motion.a
                  key={video.id}
                  href={`/videos/${video.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex gap-4 p-4 hover:bg-[#0077cc] transition-colors group"
                >
                  {/* Thumbnail */}
                  <div className="relative w-32 flex-shrink-0 aspect-video overflow-hidden bg-[#0077cc]">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-8 h-8 bg-[#d4af37]/90 flex items-center justify-center">
                        <Play className="text-[#002d4f] fill-[#002d4f]" size={14} />
                      </div>
                    </div>
                    <div className="absolute bottom-1 left-1 bg-black/80 text-[#ffffff] text-[10px] px-1 py-0.5 font-[family-name:var(--font-display)]">
                      {video.duration}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[#d4af37] text-xs font-[family-name:var(--font-display)] font-semibold">
                      {video.category}
                    </span>
                    <h4 className="font-[family-name:var(--font-display)] font-semibold text-[#ffffff] text-sm leading-relaxed mt-1 group-hover:text-[#d4af37] transition-colors line-clamp-2">
                      {video.title}
                    </h4>
                    <span className="text-[#b8c8d8] text-xs mt-1 flex items-center gap-1">
                      <Eye size={12} />
                      {video.views}
                    </span>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
