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

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-midnight text-white relative overflow-hidden">
      {/* Decorative Pattern */}
      <div className="absolute inset-0 star-pattern opacity-20" />

      {/* Main Footer */}
      <div className="container-luxury relative pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <motion.a
              href="/"
              className="flex items-center gap-3 mb-6"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center">
                  <span className="text-white font-[family-name:var(--font-display)] font-black text-2xl">إ</span>
                </div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-gold-light rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-[family-name:var(--font-display)] font-black text-xl text-white leading-tight">
                  الإقتصاد والأعمال
                </span>
                <span className="text-[10px] text-gold font-[family-name:var(--font-display)] tracking-wider">
                  Al-Iktissad Wal-Aamal
                </span>
              </div>
            </motion.a>

            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-sm">
              المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي منذ عام 1956. نغطي أهم التطورات في أسواق المال والأعمال والتجارة.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 text-sm">
              <a href="mailto:info@iktissadonline.com" className="flex items-center gap-3 text-white/60 hover:text-gold transition-colors">
                <Mail size={16} className="text-gold" />
                info@iktissadonline.com
              </a>
              <a href="tel:+9611000000" className="flex items-center gap-3 text-white/60 hover:text-gold transition-colors">
                <Phone size={16} className="text-gold" />
                +961 1 000 000
              </a>
              <span className="flex items-center gap-3 text-white/60">
                <MapPin size={16} className="text-gold" />
                بيروت، لبنان
              </span>
            </div>
          </div>

          {/* Sectors */}
          <div>
            <h4 className="font-[family-name:var(--font-display)] font-bold text-gold mb-4">القطاعات</h4>
            <ul className="space-y-2">
              {footerLinks.sectors.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white hover:pr-2 transition-all duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Countries */}
          <div>
            <h4 className="font-[family-name:var(--font-display)] font-bold text-gold mb-4">البلدان</h4>
            <ul className="space-y-2">
              {footerLinks.countries.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white hover:pr-2 transition-all duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Group Publications */}
          <div>
            <h4 className="font-[family-name:var(--font-display)] font-bold text-gold mb-4">مجموعة الإقتصاد</h4>
            <ul className="space-y-2">
              {footerLinks.group.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-white/60 hover:text-white hover:pr-2 transition-all duration-200 flex items-center gap-1"
                  >
                    {link.name}
                    {link.external && <ExternalLink size={12} />}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-[family-name:var(--font-display)] font-bold text-gold mb-4">عن الموقع</h4>
            <ul className="space-y-2">
              {footerLinks.about.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white hover:pr-2 transition-all duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright */}
          <p className="text-white/40 text-sm font-[family-name:var(--font-display)]">
            © {new Date().getFullYear()} الإقتصاد والأعمال. جميع الحقوق محفوظة.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <motion.a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                className={`w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all duration-300 ${social.color}`}
                aria-label={social.label}
              >
                <social.icon size={18} />
              </motion.a>
            ))}
          </div>

          {/* Back to Top */}
          <motion.button
            onClick={scrollToTop}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-lg bg-gold text-navy flex items-center justify-center"
            aria-label="العودة للأعلى"
          >
            <ChevronUp size={20} />
          </motion.button>
        </div>
      </div>

      {/* Brand Strip */}
      <div className="bg-navy py-4">
        <div className="container-luxury">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/30 font-[family-name:var(--font-display)]">
            <span>مجلة الإقتصاد والأعمال</span>
            <span>•</span>
            <span>أسواق العرب</span>
            <span>•</span>
            <span>البنوك والمصارف</span>
            <span>•</span>
            <span>دليل قادة الأعمال</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
