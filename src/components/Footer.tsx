'use client';

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
  ExternalLink
} from 'lucide-react';

const footerLinks = {
  sections: [
    { name: 'اقتصاد', href: '/sections/economy' },
    { name: 'شركات', href: '/sections/companies' },
    { name: 'أسواق', href: '/sections/markets' },
    { name: 'تكنولوجيا', href: '/sections/technology' },
    { name: 'طاقة وابتكار', href: '/sections/energy-innovation' },
    { name: 'رأي', href: '/sections/opinion' },
    { name: 'ملفات', href: '/sections/files' },
    { name: 'فيديو', href: '/sections/video' },
  ],
  sectors: [
    { name: 'صناعة', href: '/sectors/industry' },
    { name: 'زراعة', href: '/sectors/agriculture' },
    { name: 'تجارة', href: '/sectors/trade' },
    { name: 'مال ومصارف', href: '/sectors/finance' },
    { name: 'استثمار', href: '/sectors/investment' },
    { name: 'عقار', href: '/sectors/real-estate' },
    { name: 'سياحة وترفيه', href: '/sectors/tourism-entertainment' },
    { name: 'طاقة وبيئة', href: '/sectors/energy-environment' },
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

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative overflow-hidden mt-16">
      {/* Main Footer */}
      <div className="bg-midnight text-white relative overflow-hidden pt-16">
        <div className="absolute inset-0 star-pattern opacity-20" />

        {/* Decorative Gold Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

        <div className="container-luxury relative py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
            {/* Brand Column */}
            <div className="lg:col-span-4">
              <motion.a
                href="/"
                className="flex items-center gap-4 mb-8"
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-gold to-gold-dark rounded-2xl flex items-center justify-center shadow-lg shadow-gold/30">
                    <span className="text-white font-[family-name:var(--font-display)] font-black text-4xl">إ</span>
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-gold-light rounded-full animate-pulse"></div>
                </div>
                <div className="flex flex-col">
                  <span className="font-[family-name:var(--font-display)] font-black text-3xl text-white leading-tight">
                    الإقتصاد والأعمال
                  </span>
                  <span className="text-sm text-gold font-[family-name:var(--font-display)] tracking-wider mt-1">
                    AL-IKTISSAD WAL-AAMAL
                  </span>
                </div>
              </motion.a>

              <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-md">
                المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي منذ عام 1956. نغطي أهم التطورات في أسواق المال والأعمال والتجارة.
              </p>

              {/* Contact Info */}
              <div className="space-y-4">
                <a href="mailto:info@iktissadonline.com" className="flex items-center gap-4 text-white/60 hover:text-gold transition-colors group">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <Mail size={22} className="text-gold" />
                  </div>
                  <span className="text-base">info@iktissadonline.com</span>
                </a>
                <a href="tel:+9611000000" className="flex items-center gap-4 text-white/60 hover:text-gold transition-colors group">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <Phone size={22} className="text-gold" />
                  </div>
                  <span className="text-base" dir="ltr">+961 1 000 000</span>
                </a>
                <div className="flex items-center gap-4 text-white/60">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                    <MapPin size={22} className="text-gold" />
                  </div>
                  <span className="text-base">بيروت، لبنان</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-10">
                <h5 className="text-base text-white/50 mb-5 font-[family-name:var(--font-display)]">تابعنا على</h5>
                <div className="flex items-center gap-3">
                  {socialLinks.map((social) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1, y: -3 }}
                      whileTap={{ scale: 0.9 }}
                      className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all duration-300 ${social.color}`}
                      aria-label={social.label}
                    >
                      <social.icon size={22} />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>

            {/* Links Columns */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                {/* Sections - الأبواب */}
                <div>
                  <h4 className="font-[family-name:var(--font-display)] font-bold text-xl mb-8 flex items-center gap-3">
                    <span className="w-3 h-3 bg-gold rounded-full"></span>
                    <span className="text-gold">الأبواب</span>
                  </h4>
                  <ul className="space-y-4">
                    {footerLinks.sections.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className="text-base text-white/60 hover:text-white hover:pr-2 transition-all duration-200 flex items-center gap-3 group"
                        >
                          <span className="w-1.5 h-1.5 bg-gold/50 rounded-full group-hover:w-3 transition-all"></span>
                          {link.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sectors - القطاعات */}
                <div>
                  <h4 className="font-[family-name:var(--font-display)] font-bold text-xl mb-8 flex items-center gap-3">
                    <span className="w-3 h-3 bg-gold rounded-full"></span>
                    <span className="text-gold">القطاعات</span>
                  </h4>
                  <ul className="space-y-4">
                    {footerLinks.sectors.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className="text-base text-white/60 hover:text-white hover:pr-2 transition-all duration-200 flex items-center gap-3 group"
                        >
                          <span className="w-1.5 h-1.5 bg-gold/50 rounded-full group-hover:w-3 transition-all"></span>
                          {link.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Group Publications */}
                <div>
                  <h4 className="font-[family-name:var(--font-display)] font-bold text-xl mb-8 flex items-center gap-3">
                    <span className="w-3 h-3 bg-gold rounded-full"></span>
                    <span className="text-gold">مجموعة الإقتصاد</span>
                  </h4>
                  <ul className="space-y-4">
                    {footerLinks.group.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          target={link.external ? '_blank' : undefined}
                          rel={link.external ? 'noopener noreferrer' : undefined}
                          className="text-base text-white/60 hover:text-white hover:pr-2 transition-all duration-200 flex items-center gap-3 group"
                        >
                          <span className="w-1.5 h-1.5 bg-gold/50 rounded-full group-hover:w-3 transition-all"></span>
                          {link.name}
                          {link.external && <ExternalLink size={14} className="opacity-50" />}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* About */}
                <div>
                  <h4 className="font-[family-name:var(--font-display)] font-bold text-xl mb-8 flex items-center gap-3">
                    <span className="w-3 h-3 bg-gold rounded-full"></span>
                    <span className="text-gold">عن الموقع</span>
                  </h4>
                  <ul className="space-y-4">
                    {footerLinks.about.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className="text-base text-white/60 hover:text-white hover:pr-2 transition-all duration-200 flex items-center gap-3 group"
                        >
                          <span className="w-1.5 h-1.5 bg-gold/50 rounded-full group-hover:w-3 transition-all"></span>
                          {link.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative h-px mb-10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-6 h-6 bg-gold rotate-45" />
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Copyright */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <p className="text-white/40 text-base font-[family-name:var(--font-display)]">
                © {new Date().getFullYear()} الإقتصاد والأعمال. جميع الحقوق محفوظة.
              </p>
              <div className="flex items-center gap-6 text-white/30 text-sm">
                <a href="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</a>
                <span>•</span>
                <a href="/terms" className="hover:text-white transition-colors">شروط الاستخدام</a>
              </div>
            </div>

            {/* Back to Top */}
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              className="group flex items-center gap-4 bg-gold/10 hover:bg-gold text-gold hover:text-navy px-8 py-4 rounded-xl transition-all duration-300"
              aria-label="العودة للأعلى"
            >
              <span className="font-[family-name:var(--font-display)] font-bold text-base">
                العودة للأعلى
              </span>
              <ChevronUp size={22} className="group-hover:-translate-y-1 transition-transform" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Brand Strip */}
      <div className="bg-[#0a1628] py-6">
        <div className="container-luxury">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-3 text-sm text-white/30 font-[family-name:var(--font-display)]">
            <span className="flex items-center gap-3">
              <span className="w-2 h-2 bg-gold/40 rounded-full"></span>
              مجلة الإقتصاد والأعمال
            </span>
            <span className="flex items-center gap-3">
              <span className="w-2 h-2 bg-gold/40 rounded-full"></span>
              أسواق العرب
            </span>
            <span className="flex items-center gap-3">
              <span className="w-2 h-2 bg-gold/40 rounded-full"></span>
              البنوك والمصارف
            </span>
            <span className="flex items-center gap-3">
              <span className="w-2 h-2 bg-gold/40 rounded-full"></span>
              دليل قادة الأعمال
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
