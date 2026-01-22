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
  { icon: Facebook, href: 'https://facebook.com/iktissad', label: 'Facebook' },
  { icon: Twitter, href: 'https://twitter.com/iktissad', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com/iktissad', label: 'Instagram' },
  { icon: Linkedin, href: 'https://linkedin.com/company/iktissad', label: 'LinkedIn' },
  { icon: Youtube, href: 'https://youtube.com/iktissad', label: 'YouTube' },
];

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative overflow-hidden mt-20">
      {/* Main Footer */}
      <div className="bg-obsidian text-white relative overflow-hidden">
        {/* Pattern Overlay */}
        <div className="absolute inset-0 pattern-arabesque opacity-20" />

        {/* Gold Line Top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

        <div className="container-editorial relative py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Brand Column */}
            <div className="lg:col-span-4">
              <motion.a
                href="/"
                className="flex items-center gap-4 mb-10"
                whileHover={{ scale: 1.02 }}
              >
                {/* Logo */}
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-gold via-gold-muted to-bronze flex items-center justify-center shadow-gold">
                    <span className="text-obsidian font-[family-name:var(--font-display)] font-black text-3xl">إ</span>
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-gold" />
                </div>
                <div className="flex flex-col">
                  <span className="font-[family-name:var(--font-display)] font-black text-2xl text-white leading-tight">
                    الإقتصاد والأعمال
                  </span>
                  <span className="text-xs text-gold font-[family-name:var(--font-accent)] tracking-[0.15em] mt-1">
                    AL-IKTISSAD WAL-AAMAL
                  </span>
                </div>
              </motion.a>

              <p className="text-white/70 text-base leading-relaxed mb-10 max-w-sm font-[family-name:var(--font-body)]">
                المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي منذ عام 1956. نغطي أهم التطورات في أسواق المال والأعمال والتجارة.
              </p>

              {/* Contact Info */}
              <div className="space-y-4">
                <a href="mailto:info@iktissadonline.com" className="flex items-center gap-4 text-white/70 hover:text-gold transition-colors group">
                  <div className="w-10 h-10 border border-gold/20 flex items-center justify-center group-hover:border-gold transition-colors">
                    <Mail size={18} className="text-gold" />
                  </div>
                  <span className="text-sm">info@iktissadonline.com</span>
                </a>
                <a href="tel:+9611000000" className="flex items-center gap-4 text-white/70 hover:text-gold transition-colors group">
                  <div className="w-10 h-10 border border-gold/20 flex items-center justify-center group-hover:border-gold transition-colors">
                    <Phone size={18} className="text-gold" />
                  </div>
                  <span className="text-sm" dir="ltr">+961 1 000 000</span>
                </a>
                <div className="flex items-center gap-4 text-white/70">
                  <div className="w-10 h-10 border border-gold/20 flex items-center justify-center">
                    <MapPin size={18} className="text-gold" />
                  </div>
                  <span className="text-sm">بيروت، لبنان</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-10">
                <span className="text-xs text-white/60 font-[family-name:var(--font-display)] block mb-4">تابعنا على</span>
                <div className="flex items-center gap-3">
                  {socialLinks.map((social) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 border border-gold/20 flex items-center justify-center text-white/70 hover:text-gold hover:border-gold transition-all duration-300"
                      aria-label={social.label}
                    >
                      <social.icon size={18} />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>

            {/* Links Columns */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                {/* Sections */}
                <div>
                  <h4 className="font-[family-name:var(--font-display)] font-bold text-lg mb-6 flex items-center gap-3">
                    <span className="w-1 h-5 bg-gold" />
                    <span className="text-gold">الأبواب</span>
                  </h4>
                  <ul className="space-y-3">
                    {footerLinks.sections.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className="text-sm text-white/70 hover:text-gold hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                        >
                          <span className="w-1 h-1 bg-gold/30 group-hover:bg-gold transition-colors" />
                          {link.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sectors */}
                <div>
                  <h4 className="font-[family-name:var(--font-display)] font-bold text-lg mb-6 flex items-center gap-3">
                    <span className="w-1 h-5 bg-gold" />
                    <span className="text-gold">القطاعات</span>
                  </h4>
                  <ul className="space-y-3">
                    {footerLinks.sectors.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className="text-sm text-white/70 hover:text-gold hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                        >
                          <span className="w-1 h-1 bg-gold/30 group-hover:bg-gold transition-colors" />
                          {link.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Group Publications */}
                <div>
                  <h4 className="font-[family-name:var(--font-display)] font-bold text-lg mb-6 flex items-center gap-3">
                    <span className="w-1 h-5 bg-gold" />
                    <span className="text-gold">المجموعة</span>
                  </h4>
                  <ul className="space-y-3">
                    {footerLinks.group.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          target={link.external ? '_blank' : undefined}
                          rel={link.external ? 'noopener noreferrer' : undefined}
                          className="text-sm text-white/70 hover:text-gold hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                        >
                          <span className="w-1 h-1 bg-gold/30 group-hover:bg-gold transition-colors" />
                          {link.name}
                          {link.external && <ExternalLink size={10} className="opacity-50" />}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* About */}
                <div>
                  <h4 className="font-[family-name:var(--font-display)] font-bold text-lg mb-6 flex items-center gap-3">
                    <span className="w-1 h-5 bg-gold" />
                    <span className="text-gold">عن الموقع</span>
                  </h4>
                  <ul className="space-y-3">
                    {footerLinks.about.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className="text-sm text-white/70 hover:text-gold hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                        >
                          <span className="w-1 h-1 bg-gold/30 group-hover:bg-gold transition-colors" />
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
          <div className="relative h-px my-16">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
            <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-gold rotate-45" />
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Copyright */}
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
              <p className="text-white/60 text-sm font-[family-name:var(--font-display)]">
                {new Date().getFullYear()} الإقتصاد والأعمال. جميع الحقوق محفوظة.
              </p>
              <div className="flex items-center gap-6 text-white/60 text-xs">
                <a href="/privacy" className="hover:text-gold transition-colors">سياسة الخصوصية</a>
                <span className="w-1 h-1 bg-gold/30 rounded-full" />
                <a href="/terms" className="hover:text-gold transition-colors">شروط الاستخدام</a>
              </div>
            </div>

            {/* Back to Top */}
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group flex items-center gap-3 border border-gold/30 hover:border-gold text-gold px-6 py-3 transition-all duration-300"
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
      <div className="bg-midnight py-5 border-t border-gold/10">
        <div className="container-editorial">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-xs text-white/60 font-[family-name:var(--font-display)]">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/30 rotate-45" />
              مجلة الإقتصاد والأعمال
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/30 rotate-45" />
              أسواق العرب
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/30 rotate-45" />
              البنوك والمصارف
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/30 rotate-45" />
              دليل قادة الأعمال
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
