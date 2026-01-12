'use client';

import { motion } from 'motion/react';
import { MapPin, ArrowUpLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const countries = [
  {
    id: 'saudi',
    name: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=800&h=600&fit=crop',
    articleCount: 2450,
    description: 'أخبار الاقتصاد السعودي ورؤية 2030',
    gdp: '1.1 تريليون دولار',
    capital: 'الرياض'
  },
  {
    id: 'uae',
    name: 'الإمارات العربية المتحدة',
    flag: '🇦🇪',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop',
    articleCount: 1890,
    description: 'مركز الأعمال والسياحة في المنطقة',
    gdp: '507 مليار دولار',
    capital: 'أبوظبي'
  },
  {
    id: 'egypt',
    name: 'جمهورية مصر العربية',
    flag: '🇪🇬',
    image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop',
    articleCount: 1560,
    description: 'أكبر اقتصاد عربي من حيث السكان',
    gdp: '476 مليار دولار',
    capital: 'القاهرة'
  },
  {
    id: 'lebanon',
    name: 'الجمهورية اللبنانية',
    flag: '🇱🇧',
    image: 'https://images.unsplash.com/photo-1579606032821-4e6161c81571?w=800&h=600&fit=crop',
    articleCount: 980,
    description: 'مركز مالي وثقافي تاريخي',
    gdp: '23 مليار دولار',
    capital: 'بيروت'
  },
  {
    id: 'qatar',
    name: 'دولة قطر',
    flag: '🇶🇦',
    image: 'https://images.unsplash.com/photo-1548972150-3c1d2e6f5176?w=800&h=600&fit=crop',
    articleCount: 756,
    description: 'أعلى دخل للفرد في العالم',
    gdp: '221 مليار دولار',
    capital: 'الدوحة'
  },
  {
    id: 'kuwait',
    name: 'دولة الكويت',
    flag: '🇰🇼',
    image: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=800&h=600&fit=crop',
    articleCount: 654,
    description: 'ثروة نفطية وصندوق سيادي عريق',
    gdp: '175 مليار دولار',
    capital: 'الكويت'
  },
  {
    id: 'bahrain',
    name: 'مملكة البحرين',
    flag: '🇧🇭',
    image: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&h=600&fit=crop',
    articleCount: 432,
    description: 'مركز مالي إقليمي متطور',
    gdp: '44 مليار دولار',
    capital: 'المنامة'
  },
  {
    id: 'oman',
    name: 'سلطنة عُمان',
    flag: '🇴🇲',
    image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&h=600&fit=crop',
    articleCount: 387,
    description: 'تنويع اقتصادي وسياحة متنامية',
    gdp: '108 مليار دولار',
    capital: 'مسقط'
  },
  {
    id: 'jordan',
    name: 'المملكة الأردنية الهاشمية',
    flag: '🇯🇴',
    image: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800&h=600&fit=crop',
    articleCount: 345,
    description: 'اقتصاد خدمي متطور',
    gdp: '47 مليار دولار',
    capital: 'عمّان'
  },
  {
    id: 'morocco',
    name: 'المملكة المغربية',
    flag: '🇲🇦',
    image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&h=600&fit=crop',
    articleCount: 298,
    description: 'بوابة أفريقيا للأعمال',
    gdp: '143 مليار دولار',
    capital: 'الرباط'
  }
];

export default function CountriesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-20 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <MapPin className="text-gold" size={24} />
                <span className="text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider">
                  تغطية إقليمية
                </span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mt-2 mb-4">
                البلدان
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                تغطية اقتصادية شاملة للدول العربية والشرق الأوسط
              </p>
            </motion.div>
          </div>
        </section>

        {/* Countries Grid */}
        <section className="py-16">
          <div className="container-luxury">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {countries.map((country, index) => (
                <motion.a
                  key={country.id}
                  href={`/countries/${country.id}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8 }}
                  className="group relative rounded-2xl overflow-hidden h-80"
                >
                  {/* Background Image */}
                  <img
                    src={country.image}
                    alt={country.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/60 to-transparent" />

                  {/* Flag Badge */}
                  <div className="absolute top-4 right-4 text-4xl">
                    {country.flag}
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-xl text-white mb-2 group-hover:text-gold transition-colors">
                      {country.name}
                    </h3>
                    <p className="text-white/70 text-sm mb-4">
                      {country.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <div className="flex items-center gap-4">
                        <span>الناتج: {country.gdp}</span>
                        <span>العاصمة: {country.capital}</span>
                      </div>
                    </div>

                    {/* Article Count */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
                      <span className="text-white/60 text-sm font-[family-name:var(--font-display)]">
                        {country.articleCount.toLocaleString('ar-SA')} مقال
                      </span>
                      <span className="flex items-center gap-1 text-gold text-sm font-[family-name:var(--font-display)] font-semibold">
                        استكشف
                        <ArrowUpLeft size={16} />
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* Map Section (Decorative) */}
        <section className="py-16 bg-ivory">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                تغطيتنا الجغرافية
              </h2>
              <p className="text-slate max-w-2xl mx-auto">
                نغطي أخبار الاقتصاد والأعمال من جميع أنحاء العالم العربي والشرق الأوسط
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {countries.slice(0, 10).map((country, index) => (
                <motion.a
                  key={country.id}
                  href={`/countries/${country.id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-all text-center"
                >
                  <span className="text-3xl mb-2 block">{country.flag}</span>
                  <span className="font-[family-name:var(--font-display)] font-semibold text-navy text-sm">
                    {country.name.split(' ').slice(-1)[0]}
                  </span>
                </motion.a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
