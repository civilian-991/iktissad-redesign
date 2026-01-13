'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  ChevronUp,
  ExternalLink,
  Send,
  Award,
  Users,
  Newspaper,
  Globe,
  Sparkles
} from 'lucide-react';

const footerLinks = {
  sectors: [
    { name: 'اقتصاد عام', href: '/sectors/economy' },
    { name: 'مال ومصارف', href: '/sectors/finance' },
    { name: 'طاقة', href: '/sectors/energy' },
    { name: 'نفط وغاز', href: '/sectors/oil-gas' },
    { name: 'عقار وإنشاءات', href: '/sectors/real-estate' },
    { name: 'تكنولوجيا', href: '/sectors/technology' },
  ],
  countries: [
    { name: 'السعودية', href: '/countries/saudi' },
    { name: 'الإمارات', href: '/countries/uae' },
    { name: 'مصر', href: '/countries/egypt' },
    { name: 'لبنان', href: '/countries/lebanon' },
    { name: 'قطر', href: '/countries/qatar' },
    { name: 'الكويت', href: '/countries/kuwait' },
  ],
  group: [
    { name: 'مجلة الإقتصاد والأعمال', href: '#', external: true },
    { name: 'مجلة أسواق العرب', href: '#', external: true },
    { name: 'مجلة البنوك والمصارف', href: '#', external: true },
    { name: 'دليل قادة الأعمال', href: '#', external: true },
  ],
  about: [
    { name: 'من نحن', href: '/about' },
    { name: 'فريق العمل', href: '/team' },
    { name: 'تواصل معنا', href: '/contact' },
    { name: 'الإعلانات', href: '/advertise' },
  ]
};

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/iktissad', label: 'Facebook', color: 'hover:bg-blue-600' },
  { icon: Twitter, href: 'https://twitter.com/iktissad', label: 'Twitter', color: 'hover:bg-sky-500' },
  { icon: Instagram, href: 'https://instagram.com/iktissad', label: 'Instagram', color: 'hover:bg-pink-600' },
  { icon: Linkedin, href: 'https://linkedin.com/company/iktissad', label: 'LinkedIn', color: 'hover:bg-blue-700' },
  { icon: Youtube, href: 'https://youtube.com/iktissad', label: 'YouTube', color: 'hover:bg-red-600' },
];

const stats = [
  { icon: Award, value: '1956', label: 'منذ عام', suffix: '' },
  { icon: Users, value: '2.5', label: 'مليون قارئ شهرياً', suffix: 'M+' },
  { icon: Newspaper, value: '540', label: 'عدد منشور', suffix: '+' },
  { icon: Globe, value: '22', label: 'دولة عربية', suffix: '' },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  return (
    <footer className="relative overflow-hidden">
      {/* Newsletter Section */}
      <div className="bg-gradient-to-br from-gold via-gold-dark to-amber-700 relative">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        {/* Floating Elements */}
        <div className="absolute top-10 right-20 w-20 h-20 border-2 border-white/20 rounded-full animate-pulse" />
        <div className="absolute bottom-10 left-20 w-32 h-32 border border-white/10 rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white/20 rounded-full" />

        <div className="container-luxury relative py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Newsletter Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Sparkles className="text-white" size={24} />
                </div>
                <span className="text-white/90 font-[family-name:var(--font-display)] font-semibold">
                  النشرة الإخبارية
                </span>
              </div>
              <h3
                className="text-3xl lg:text-4xl font-[family-name:var(--font-display)] font-black mb-4 leading-tight"
                style={{ color: 'rgb(201, 162, 39)' }}
              >
                ابقَ على اطلاع بآخر
                <br />
                <span className="text-navy">الأخبار الاقتصادية</span>
              </h3>
              <p className="text-white/80 text-lg leading-relaxed max-w-lg">
                اشترك في نشرتنا الإخبارية واحصل على أهم الأخبار والتحليلات الاقتصادية مباشرة في بريدك الإلكتروني.
              </p>
            </motion.div>

            {/* Newsletter Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <form onSubmit={handleSubscribe} className="relative">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="أدخل بريدك الإلكتروني"
                      className="flex-1 bg-white rounded-xl px-6 py-4 text-navy placeholder:text-slate/60 font-[family-name:var(--font-display)] focus:outline-none focus:ring-2 focus:ring-navy/20"
                      dir="ltr"
                    />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="bg-navy hover:bg-navy-light text-white px-8 py-4 rounded-xl font-[family-name:var(--font-display)] font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <span>اشترك الآن</span>
                      <Send size={18} className="rotate-180" />
                    </motion.button>
                  </div>
                </div>

                {/* Success Message */}
                {isSubscribed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-12 right-0 left-0 text-center"
                  >
                    <span className="inline-flex items-center gap-2 bg-white text-navy px-4 py-2 rounded-lg font-[family-name:var(--font-display)] font-semibold text-sm">
                      <Sparkles size={16} />
                      تم الاشتراك بنجاح!
                    </span>
                  </motion.div>
                )}
              </form>

              <p className="text-white/60 text-sm mt-4 text-center sm:text-right">
                نحترم خصوصيتك. يمكنك إلغاء الاشتراك في أي وقت.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-navy relative">
        <div className="absolute inset-0 star-pattern opacity-10" />
        <div className="container-luxury relative py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center group"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/20 rounded-xl mb-4 group-hover:bg-gold/30 transition-colors">
                  <stat.icon className="text-gold" size={28} />
                </div>
                <div className="font-[family-name:var(--font-display)] font-black text-4xl text-white mb-1">
                  {stat.value}
                  <span className="text-gold">{stat.suffix}</span>
                </div>
                <div className="text-white/60 text-sm font-[family-name:var(--font-display)]">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="bg-midnight text-white relative overflow-hidden">
        <div className="absolute inset-0 star-pattern opacity-20" />

        {/* Decorative Gold Lines */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

        <div className="container-luxury relative pt-16 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <motion.a
                href="/"
                className="flex items-center gap-4 mb-6"
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center shadow-lg shadow-gold/30">
                    <span className="text-white font-[family-name:var(--font-display)] font-black text-3xl">إ</span>
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gold-light rounded-full animate-pulse"></div>
                </div>
                <div className="flex flex-col">
                  <span className="font-[family-name:var(--font-display)] font-black text-2xl text-white leading-tight">
                    الإقتصاد والأعمال
                  </span>
                  <span className="text-xs text-gold font-[family-name:var(--font-display)] tracking-wider">
                    AL-IKTISSAD WAL-AAMAL
                  </span>
                </div>
              </motion.a>

              <p className="text-white/60 leading-relaxed mb-6 max-w-sm">
                المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي منذ عام 1956. نغطي أهم التطورات في أسواق المال والأعمال والتجارة.
              </p>

              {/* Contact Info */}
              <div className="space-y-3">
                <a href="mailto:info@iktissadonline.com" className="flex items-center gap-3 text-white/60 hover:text-gold transition-colors group">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <Mail size={18} className="text-gold" />
                  </div>
                  <span className="text-sm">info@iktissadonline.com</span>
                </a>
                <a href="tel:+9611000000" className="flex items-center gap-3 text-white/60 hover:text-gold transition-colors group">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <Phone size={18} className="text-gold" />
                  </div>
                  <span className="text-sm" dir="ltr">+961 1 000 000</span>
                </a>
                <div className="flex items-center gap-3 text-white/60">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                    <MapPin size={18} className="text-gold" />
                  </div>
                  <span className="text-sm">بيروت، لبنان</span>
                </div>
              </div>
            </div>

            {/* Sectors */}
            <div>
              <h4 className="font-[family-name:var(--font-display)] font-bold text-lg mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-gold rounded-full"></span>
                <span className="text-gold">القطاعات</span>
              </h4>
              <ul className="space-y-3">
                {footerLinks.sectors.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 bg-gold/50 rounded-full group-hover:w-2 transition-all"></span>
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Countries */}
            <div>
              <h4 className="font-[family-name:var(--font-display)] font-bold text-lg mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-gold rounded-full"></span>
                <span className="text-gold">البلدان</span>
              </h4>
              <ul className="space-y-3">
                {footerLinks.countries.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 bg-gold/50 rounded-full group-hover:w-2 transition-all"></span>
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Group Publications */}
            <div>
              <h4 className="font-[family-name:var(--font-display)] font-bold text-lg mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-gold rounded-full"></span>
                <span className="text-gold">مجموعة الإقتصاد</span>
              </h4>
              <ul className="space-y-3">
                {footerLinks.group.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      className="text-sm text-white/60 hover:text-white hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 bg-gold/50 rounded-full group-hover:w-2 transition-all"></span>
                      {link.name}
                      {link.external && <ExternalLink size={12} className="opacity-50" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* About */}
            <div>
              <h4 className="font-[family-name:var(--font-display)] font-bold text-lg mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-gold rounded-full"></span>
                <span className="text-gold">عن الموقع</span>
              </h4>
              <ul className="space-y-3">
                {footerLinks.about.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 bg-gold/50 rounded-full group-hover:w-2 transition-all"></span>
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>

              {/* Social Links in About Column */}
              <div className="mt-8">
                <h5 className="text-sm text-white/40 mb-4 font-[family-name:var(--font-display)]">تابعنا على</h5>
                <div className="flex items-center gap-2">
                  {socialLinks.map((social) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.9 }}
                      className={`w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all duration-300 ${social.color}`}
                      aria-label={social.label}
                    >
                      <social.icon size={16} />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative h-px mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 bg-gold rotate-45" />
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Copyright */}
            <div className="flex items-center gap-4">
              <p className="text-white/40 text-sm font-[family-name:var(--font-display)]">
                © {new Date().getFullYear()} الإقتصاد والأعمال. جميع الحقوق محفوظة.
              </p>
              <div className="hidden md:flex items-center gap-4 text-white/30 text-xs">
                <a href="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</a>
                <span>•</span>
                <a href="/terms" className="hover:text-white transition-colors">شروط الاستخدام</a>
              </div>
            </div>

            {/* Back to Top */}
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
              className="group flex items-center gap-3 bg-gold/10 hover:bg-gold text-gold hover:text-navy px-5 py-3 rounded-xl transition-all duration-300"
              aria-label="العودة للأعلى"
            >
              <span className="font-[family-name:var(--font-display)] font-semibold text-sm">
                العودة للأعلى
              </span>
              <ChevronUp size={18} className="group-hover:-translate-y-1 transition-transform" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Brand Strip */}
      <div className="bg-[#0a1628] py-4">
        <div className="container-luxury">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-white/20 font-[family-name:var(--font-display)]">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/40 rounded-full"></span>
              مجلة الإقتصاد والأعمال
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/40 rounded-full"></span>
              أسواق العرب
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/40 rounded-full"></span>
              البنوك والمصارف
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/40 rounded-full"></span>
              دليل قادة الأعمال
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
