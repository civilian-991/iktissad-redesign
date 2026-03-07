'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { MapPin, Clock, ArrowUpLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const regions = [
  {
    id: 'gulf',
    name: 'الخليج',
    countries: [
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
      },
      {
        id: 'bahrain',
        name: 'البحرين',
        flag: 'https://flagcdn.com/w40/bh.png',
        articles: [
          {
            id: 19,
            title: 'البحرين تطلق منطقة حرة متخصصة في التكنولوجيا المالية',
            image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
            date: '10 يناير 2026'
          },
          {
            id: 20,
            title: 'مصرف البحرين المركزي يُطلق إطار تنظيمي للعملات الرقمية',
            date: '7 يناير 2026'
          },
          {
            id: 21,
            title: 'البحرين تستضيف منتدى الاستثمار الخليجي السنوي',
            date: '4 يناير 2026'
          }
        ]
      },
      {
        id: 'oman',
        name: 'عُمان',
        flag: 'https://flagcdn.com/w40/om.png',
        articles: [
          {
            id: 22,
            title: 'سلطنة عُمان تستهدف استقطاب 11 مليار دولار استثمارات أجنبية في 2026',
            image: 'https://images.unsplash.com/photo-1578894382765-62e1e22c3b12?w=600&h=400&fit=crop',
            date: '9 يناير 2026'
          },
          {
            id: 23,
            title: 'ميناء صحار يحقق أرقاماً قياسية في حركة الحاويات',
            date: '6 يناير 2026'
          },
          {
            id: 24,
            title: 'عُمان تنجز الربط الكهربائي مع دول الخليج',
            date: '3 يناير 2026'
          }
        ]
      }
    ]
  },
  {
    id: 'mashreq',
    name: 'المشرق العربي',
    countries: [
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
        id: 'syria',
        name: 'سوريا',
        flag: 'https://flagcdn.com/w40/sy.png',
        articles: [
          {
            id: 30,
            title: 'مؤتمر دولي لإعادة إعمار سوريا يُعقد في الدوحة',
            image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
            date: '11 يناير 2026'
          },
          {
            id: 31,
            title: 'الحكومة السورية الجديدة تطلق خطة للإصلاح الاقتصادي',
            date: '9 يناير 2026'
          },
          {
            id: 32,
            title: 'فتح منفذ نصيب الحدودي مع الأردن أمام حركة التجارة',
            date: '7 يناير 2026'
          }
        ]
      },
      {
        id: 'jordan',
        name: 'الأردن',
        flag: 'https://flagcdn.com/w40/jo.png',
        articles: [
          {
            id: 33,
            title: 'الأردن يوقع اتفاقيات استثمار بقيمة 4 مليارات دولار مع شركاء دوليين',
            image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=600&h=400&fit=crop',
            date: '10 يناير 2026'
          },
          {
            id: 34,
            title: 'البنك المركزي الأردني يُثبّت أسعار الفائدة للربع الثاني',
            date: '8 يناير 2026'
          },
          {
            id: 35,
            title: 'الأردن يحقق فائضاً في ميزانه التجاري لأول مرة منذ عقدين',
            date: '5 يناير 2026'
          }
        ]
      },
      {
        id: 'iraq',
        name: 'العراق',
        flag: 'https://flagcdn.com/w40/iq.png',
        articles: [
          {
            id: 36,
            title: 'العراق يرفع طاقته الإنتاجية النفطية إلى 5 ملايين برميل يومياً',
            image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=400&fit=crop',
            date: '11 يناير 2026'
          },
          {
            id: 37,
            title: 'بغداد تطلق مشروع التحديث الشامل لمنظومة الكهرباء',
            date: '8 يناير 2026'
          },
          {
            id: 38,
            title: 'العراق يوقع عقوداً نفطية جديدة مع شركات دولية كبرى',
            date: '5 يناير 2026'
          }
        ]
      }
    ]
  },
  {
    id: 'northafrica',
    name: 'شمال أفريقيا',
    countries: [
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
        id: 'morocco',
        name: 'المغرب',
        flag: 'https://flagcdn.com/w40/ma.png',
        articles: [
          {
            id: 40,
            title: 'المغرب يستعد لاستضافة كأس العالم 2030 بمليارات الاستثمارات',
            image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=600&h=400&fit=crop',
            date: '12 يناير 2026'
          },
          {
            id: 41,
            title: 'البنك الدولي يمنح المغرب قرضاً بقيمة 1.5 مليار دولار لدعم الطاقة الخضراء',
            date: '9 يناير 2026'
          },
          {
            id: 42,
            title: 'الدار البيضاء تتصدر قائمة أفضل المدن الأفريقية للأعمال',
            date: '6 يناير 2026'
          }
        ]
      },
      {
        id: 'algeria',
        name: 'الجزائر',
        flag: 'https://flagcdn.com/w40/dz.png',
        articles: [
          {
            id: 43,
            title: 'الجزائر ترفع صادراتها من الغاز الطبيعي إلى أوروبا بنسبة 20%',
            image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=400&fit=crop',
            date: '10 يناير 2026'
          },
          {
            id: 44,
            title: 'صندوق النقد الدولي يرفع توقعاته لنمو الاقتصاد الجزائري',
            date: '7 يناير 2026'
          },
          {
            id: 45,
            title: 'الجزائر تُطلق مشروع ضخم للطاقة الشمسية في الصحراء',
            date: '4 يناير 2026'
          }
        ]
      },
      {
        id: 'tunisia',
        name: 'تونس',
        flag: 'https://flagcdn.com/w40/tn.png',
        articles: [
          {
            id: 46,
            title: 'تونس تُبرم اتفاقية شراكة اقتصادية مع الاتحاد الأوروبي',
            image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
            date: '11 يناير 2026'
          },
          {
            id: 47,
            title: 'قطاع السياحة التونسي يسجل رقماً قياسياً في عدد الزوار',
            date: '8 يناير 2026'
          },
          {
            id: 48,
            title: 'البنك المركزي التونسي يُخفض أسعار الفائدة لتحفيز النمو',
            date: '5 يناير 2026'
          }
        ]
      }
    ]
  },
  {
    id: 'world',
    name: 'العالم',
    countries: [
      {
        id: 'usa',
        name: 'أمريكا',
        flag: 'https://flagcdn.com/w40/us.png',
        articles: [
          {
            id: 50,
            title: 'الاحتياطي الفيدرالي الأمريكي يُبقي أسعار الفائدة ثابتة في اجتماع يناير',
            image: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=600&h=400&fit=crop',
            date: '12 يناير 2026'
          },
          {
            id: 51,
            title: 'وول ستريت يُسجل مكاسب قوية مع تراجع مخاوف التضخم',
            date: '10 يناير 2026'
          },
          {
            id: 52,
            title: 'شركات التكنولوجيا الأمريكية تُضخ 200 مليار دولار في الذكاء الاصطناعي',
            date: '8 يناير 2026'
          }
        ]
      },
      {
        id: 'china',
        name: 'الصين',
        flag: 'https://flagcdn.com/w40/cn.png',
        articles: [
          {
            id: 53,
            title: 'الصين تُسجل نمواً اقتصادياً بنسبة 5.2% في 2025 متجاوزةً التوقعات',
            image: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=600&h=400&fit=crop',
            date: '11 يناير 2026'
          },
          {
            id: 54,
            title: 'بكين تُطلق حزمة تحفيز اقتصادي بقيمة 500 مليار يوان',
            date: '9 يناير 2026'
          },
          {
            id: 55,
            title: 'الصين تتصدر قائمة أكبر مصدري السيارات الكهربائية عالمياً',
            date: '6 يناير 2026'
          }
        ]
      },
      {
        id: 'europe',
        name: 'أوروبا',
        flag: 'https://flagcdn.com/w40/eu.png',
        articles: [
          {
            id: 56,
            title: 'البنك المركزي الأوروبي يُخفض أسعار الفائدة للمرة الثالثة',
            image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=400&fit=crop',
            date: '12 يناير 2026'
          },
          {
            id: 57,
            title: 'ألمانيا تُعلن حزمة إنقاذ صناعية بقيمة 100 مليار يورو',
            date: '9 يناير 2026'
          },
          {
            id: 58,
            title: 'الاتحاد الأوروبي يُوافق على ميزانية الطاقة الخضراء لعام 2026',
            date: '7 يناير 2026'
          }
        ]
      },
      {
        id: 'india',
        name: 'الهند',
        flag: 'https://flagcdn.com/w40/in.png',
        articles: [
          {
            id: 59,
            title: 'الهند تتجاوز اليابان لتصبح ثالث أكبر اقتصاد في العالم',
            image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&h=400&fit=crop',
            date: '10 يناير 2026'
          },
          {
            id: 60,
            title: 'بورصة مومباي تُسجل أعلى مستوياتها التاريخية',
            date: '8 يناير 2026'
          },
          {
            id: 61,
            title: 'الهند تُطلق أضخم مشروع للسكك الحديدية السريعة في آسيا',
            date: '5 يناير 2026'
          }
        ]
      }
    ]
  }
];

export default function CountryNews() {
  const { t } = useTranslation();
  const [activeRegion, setActiveRegion] = useState(regions[0]);
  const [activeCountry, setActiveCountry] = useState(regions[0].countries[0]);

  function handleRegionChange(region: typeof regions[0]) {
    setActiveRegion(region);
    setActiveCountry(region.countries[0]);
  }

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
          className="text-center mb-10"
        >
          <span className="text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider [text-shadow:_0_1px_4px_rgb(0_0_0_/_50%)]">
            {t('components.countryNews.subtitle')}
          </span>
          <h2 className="text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold mt-2 mb-4 text-white">
            {t('components.countryNews.title')}
          </h2>
          <div className="flex items-center justify-center gap-3 text-gold/50">
            <span className="w-16 h-px bg-gradient-to-r from-transparent to-gold/50"></span>
            <MapPin size={20} className="text-gold" />
            <span className="w-16 h-px bg-gradient-to-l from-transparent to-gold/50"></span>
          </div>
        </motion.div>

        {/* Region Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-2 mb-4"
        >
          {regions.map((region) => (
            <button
              key={region.id}
              onClick={() => handleRegionChange(region)}
              className={`px-6 py-2.5 font-[family-name:var(--font-display)] font-bold text-sm transition-all duration-300 border-b-2 ${
                activeRegion.id === region.id
                  ? 'text-gold border-gold'
                  : 'text-white/60 border-transparent hover:text-white hover:border-white/30'
              }`}
            >
              {region.name}
            </button>
          ))}
        </motion.div>

        {/* Divider */}
        <div className="w-full h-px bg-white/10 mb-6" />

        {/* Country Tabs */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRegion.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {activeRegion.countries.map((country) => (
              <motion.button
                key={country.id}
                onClick={() => setActiveCountry(country)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full font-[family-name:var(--font-display)] font-semibold text-sm flex items-center gap-2 transition-all duration-300 ${
                  activeCountry.id === country.id
                    ? 'bg-gold text-navy shadow-gold'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Image src={country.flag} alt={country.name} width={32} height={24} className="w-5 h-3.5 object-cover rounded-sm" />
                {country.name}
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>

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
              className="relative h-96 lg:h-auto min-h-[400px] overflow-hidden group"
            >
              <Image
                src={activeCountry.articles[0].image as string}
                alt={activeCountry.articles[0].title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Glass overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-white/5 backdrop-blur-md border-t border-white/10 p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <Image src={activeCountry.flag} alt={activeCountry.name} width={32} height={24} className="w-8 h-5 object-cover rounded-sm" />
                  <span className="text-white/70 font-[family-name:var(--font-display)] text-xs">
                    {activeRegion.name}
                  </span>
                  <span className="text-white/30 text-xs">/</span>
                  <span className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">
                    {activeCountry.name}
                  </span>
                </div>
                <h3 className="text-xl lg:text-2xl font-[family-name:var(--font-display)] font-bold leading-tight mb-4 text-gold-light">
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
                  className="block bg-white/5 backdrop-blur-sm p-6 border border-white/10 hover:bg-white/10 hover:border-gold/30 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 bg-gold/20 text-gold flex items-center justify-center font-[family-name:var(--font-display)] font-bold">
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
                className="flex items-center justify-center gap-2 w-full py-4 border border-dashed border-gold/30 text-gold font-[family-name:var(--font-display)] font-semibold hover:border-gold hover:bg-gold/10 transition-all duration-300"
              >
                {t('components.countryNews.viewAllNews', { country: activeCountry.name })}
                <ArrowUpLeft size={18} />
              </motion.a>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
