'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, ArrowUpLeft } from 'lucide-react';

const countries = [
  {
    id: 'saudi',
    name: 'السعودية',
    flag: 'https://flagcdn.com/w40/sa.png',
    articles: [
      {
        id: 1,
        title: 'فتح السوق السعودي أمام جميع فئات المستثمرين الأجانب اعتباراً من أول فبراير 2026',
        image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=600&h=400&fit=crop',
        date: '11 يناير 2026'
      },
      {
        id: 2,
        title: 'الخطوط السعودية ثاني أكثر شركات الطيران انضباطاً عالمياً',
        date: '12 يناير 2026'
      },
      {
        id: 3,
        title: 'الإعلان عن أسماء الفائزين في جائزة الملك فيصل',
        date: '9 يناير 2026'
      }
    ]
  },
  {
    id: 'uae',
    name: 'الإمارات',
    flag: 'https://flagcdn.com/w40/ae.png',
    articles: [
      {
        id: 4,
        title: 'الإمارات تكرم الدكتور نبيل صيدح بجائزة "نوابغ العرب" عن فئة الطب',
        image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop',
        date: '25 ديسمبر 2025'
      },
      {
        id: 5,
        title: 'دبي تستقبل 18 مليون سائح في النصف الأول من 2026',
        date: '8 يناير 2026'
      },
      {
        id: 6,
        title: 'إنترسك 2026 يعلن عن إطلاق فعاليات جديدة للأمن والسلامة',
        date: '6 يناير 2026'
      }
    ]
  },
  {
    id: 'egypt',
    name: 'مصر',
    flag: 'https://flagcdn.com/w40/eg.png',
    articles: [
      {
        id: 7,
        title: 'إفتتاح منتدى الأعمال المصري السوري في دمشق',
        image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=600&h=400&fit=crop',
        date: '11 يناير 2026'
      },
      {
        id: 8,
        title: 'البنك المركزي المصري يسجل أعلى احتياطي نقد أجنبي',
        date: '7 يناير 2026'
      },
      {
        id: 9,
        title: 'مصر تطلق خطة تنموية شاملة للصعيد بقيمة 500 مليار جنيه',
        date: '4 يناير 2026'
      }
    ]
  },
  {
    id: 'lebanon',
    name: 'لبنان',
    flag: 'https://flagcdn.com/w40/lb.png',
    articles: [
      {
        id: 10,
        title: 'وزير الطاقة والمياه يشيد بمواقف دولة قطر الداعمة للبنان',
        image: 'https://images.unsplash.com/photo-1579606032821-4e6161c81571?w=600&h=400&fit=crop',
        date: '12 يناير 2026'
      },
      {
        id: 11,
        title: 'إنجاز جديد للضمان الاجتماعي اللبناني: إطلاق خدمة براءة الذمة عن بُعد',
        date: '30 ديسمبر 2025'
      },
      {
        id: 12,
        title: 'مباحثات بين وزيري الزراعة في سوريا ولبنان',
        date: '11 يناير 2026'
      }
    ]
  },
  {
    id: 'qatar',
    name: 'قطر',
    flag: 'https://flagcdn.com/w40/qa.png',
    articles: [
      {
        id: 13,
        title: 'قطر تعلن عن استثمارات جديدة في قطاع التكنولوجيا بقيمة 10 مليارات دولار',
        image: 'https://images.unsplash.com/photo-1548972250-3c1d2e6f5176?w=600&h=400&fit=crop',
        date: '10 يناير 2026'
      },
      {
        id: 14,
        title: 'بنك قطر الوطني يحقق أرباحاً قياسية في الربع الأخير',
        date: '8 يناير 2026'
      },
      {
        id: 15,
        title: 'الخطوط الجوية القطرية توسع شبكتها إلى 15 وجهة جديدة',
        date: '5 يناير 2026'
      }
    ]
  },
  {
    id: 'kuwait',
    name: 'الكويت',
    flag: 'https://flagcdn.com/w40/kw.png',
    articles: [
      {
        id: 16,
        title: 'الكويت تطلق مشروع تطوير جزر فيلكا بقيمة 3 مليارات دينار',
        image: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=600&h=400&fit=crop',
        date: '9 يناير 2026'
      },
      {
        id: 17,
        title: 'صندوق الأجيال الكويتي يحقق عوائد استثنائية في 2025',
        date: '6 يناير 2026'
      },
      {
        id: 18,
        title: 'البورصة الكويتية تسجل ارتفاعات قوية مع بداية العام',
        date: '3 يناير 2026'
      }
    ]
  }
];

export default function CountryNews() {
  const [activeCountry, setActiveCountry] = useState(countries[0]);

  return (
    <section className="py-20 bg-gradient-to-br from-navy via-navy-light to-navy relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />

      <div className="container-luxury relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider [text-shadow:_0_1px_4px_rgb(0_0_0_/_50%)]">
            تغطية إقليمية
          </span>
          <h2
            className="text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold mt-2 mb-4 text-white"
          >
            أخبار البلدان
          </h2>
          <div className="flex items-center justify-center gap-3 text-gold/50">
            <span className="w-16 h-px bg-gradient-to-r from-transparent to-gold/50"></span>
            <MapPin size={20} className="text-gold" />
            <span className="w-16 h-px bg-gradient-to-l from-transparent to-gold/50"></span>
          </div>
        </motion.div>

        {/* Country Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3 mb-10"
        >
          {countries.map((country) => (
            <motion.button
              key={country.id}
              onClick={() => setActiveCountry(country)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-5 py-3 rounded-full font-[family-name:var(--font-display)] font-semibold text-sm flex items-center gap-2 transition-all duration-300 ${
                activeCountry.id === country.id
                  ? 'bg-gold text-navy shadow-gold'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              <img src={country.flag} alt={country.name} className="w-6 h-4 object-cover rounded-sm" />
              {country.name}
            </motion.button>
          ))}
        </motion.div>

        {/* Country Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCountry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid lg:grid-cols-2 gap-8"
          >
            {/* Featured Article */}
            <a
              href={`/news/${activeCountry.articles[0].id}`}
              className="relative h-96 lg:h-auto min-h-[400px] rounded-2xl overflow-hidden group"
            >
              <img
                src={activeCountry.articles[0].image}
                alt={activeCountry.articles[0].title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Solid brand background - guaranteed contrast */}
              <div className="absolute bottom-0 left-0 right-0 bg-brand p-6 lg:p-8 rounded-b-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <img src={activeCountry.flag} alt={activeCountry.name} className="w-8 h-5 object-cover rounded-sm" />
                  <span className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">
                    {activeCountry.name}
                  </span>
                </div>
                <h3
                  className="text-xl lg:text-2xl font-[family-name:var(--font-display)] font-bold leading-tight mb-4 text-gold-light"
                >
                  {activeCountry.articles[0].title}
                </h3>
                <span className="text-white text-sm flex items-center gap-2">
                  <Clock size={14} />
                  {activeCountry.articles[0].date}
                </span>
              </div>
            </a>

            {/* Article List */}
            <div className="space-y-4">
              {activeCountry.articles.slice(1).map((article, index) => (
                <motion.a
                  key={article.id}
                  href={`/news/${article.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="block bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 hover:border-gold/30 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold/20 text-gold flex items-center justify-center font-[family-name:var(--font-display)] font-bold">
                      {index + 2}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-[family-name:var(--font-display)] font-bold text-white leading-snug group-hover:text-gold transition-colors duration-300">
                        {article.title}
                      </h4>
                      <span className="text-white/70 text-sm mt-2 flex items-center gap-2">
                        <Clock size={14} />
                        {article.date}
                      </span>
                    </div>
                    <ArrowUpLeft size={20} className="text-gold/50 group-hover:text-gold transition-colors duration-300 flex-shrink-0" />
                  </div>
                </motion.a>
              ))}

              {/* View All Button */}
              <motion.a
                href={`/countries/${activeCountry.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-gold/30 text-gold font-[family-name:var(--font-display)] font-semibold hover:border-gold hover:bg-gold/10 transition-all duration-300"
              >
                عرض جميع أخبار {activeCountry.name}
                <ArrowUpLeft size={18} />
              </motion.a>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
