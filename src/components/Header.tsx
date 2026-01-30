'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu,
  X,
  Search,
  ChevronDown,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube
} from 'lucide-react';

const navigation = [
  { name: 'الرئيسية', href: '/' },
  {
    name: 'الأبواب',
    href: '/sections',
    submenu: [
      { name: 'اقتصاد', href: '/sections/economy' },
      { name: 'شركات', href: '/sections/companies' },
      { name: 'أسواق', href: '/sections/markets' },
      { name: 'تكنولوجيا', href: '/sections/technology' },
      { name: 'طاقة وابتكار', href: '/sections/energy-innovation' },
      { name: 'رأي', href: '/sections/opinion' },
      { name: 'ملفات', href: '/sections/files' },
      { name: 'فيديو', href: '/sections/video' },
    ]
  },
  {
    name: 'قطاعات',
    href: '/sectors',
    wide: true,
    submenu: [
      { name: 'صناعة', href: '/sectors/industry' },
      { name: 'زراعة', href: '/sectors/agriculture' },
      { name: 'تجارة', href: '/sectors/trade' },
      { name: 'مال ومصارف', href: '/sectors/finance' },
      { name: 'استثمار', href: '/sectors/investment' },
      { name: 'تأمين', href: '/sectors/insurance' },
      { name: 'عقار', href: '/sectors/real-estate' },
      { name: 'نقل', href: '/sectors/transport' },
      { name: 'سيارات', href: '/sectors/automotive' },
      { name: 'سياحة وترفيه', href: '/sectors/tourism-entertainment' },
      { name: 'تعليم', href: '/sectors/education' },
      { name: 'صحة', href: '/sectors/health' },
      { name: 'طاقة وبيئة', href: '/sectors/energy-environment' },
      { name: 'ريادة وابتكار', href: '/sectors/entrepreneurship' },
      { name: 'رفاهية', href: '/sectors/luxury' },
      { name: 'ثروات', href: '/sectors/wealth' },
    ]
  },
  { name: 'المجلة', href: '/magazine' },
  { name: 'مجموعة الإقتصاد والأعمال', href: '/group' },
];

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/iktissad', label: 'Facebook' },
  { icon: Twitter, href: 'https://twitter.com/iktissad', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com/iktissad', label: 'Instagram' },
  { icon: Linkedin, href: 'https://linkedin.com/company/iktissad', label: 'LinkedIn' },
  { icon: Youtube, href: 'https://youtube.com/iktissad', label: 'YouTube' },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Top Bar - Brand Color */}
      <div className="bg-navy text-white py-2.5 hidden lg:block border-b border-gold/10">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-xs text-white/80 font-[family-name:var(--font-body)]">
              {currentDate}
            </span>
            <div className="h-3 w-px bg-gold/20" />
            <span className="text-xs text-gold font-[family-name:var(--font-display)] font-semibold">
              منذ 1956
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-xs text-white/70 font-[family-name:var(--font-display)]">تابعنا</span>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-gold transition-colors duration-300"
                  aria-label={social.label}
                >
                  <social.icon size={14} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`sticky top-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'glass-light shadow-elevated py-3'
            : 'bg-paper py-5'
        }`}
      >
        <div className="container-editorial">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.a
              href="/"
              className="flex items-center group"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* Official Logo with Navy Background */}
              <div className="bg-navy px-4 py-2 rounded">
                <img
                  src="/logo-white.png"
                  alt="الإقتصاد والأعمال - Al-Iktissad Wal-Aamal"
                  className="h-10 md:h-12 w-auto"
                />
              </div>
            </motion.a>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => item.submenu && setActiveSubmenu(item.name)}
                  onMouseLeave={() => setActiveSubmenu(null)}
                >
                  <a
                    href={item.href}
                    className="flex items-center gap-1.5 px-4 py-2.5 font-[family-name:var(--font-display)] font-semibold text-sm text-obsidian hover:text-gold transition-colors duration-300 relative group"
                  >
                    <span>{item.name}</span>
                    {item.submenu && (
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-300 ${
                          activeSubmenu === item.name ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                    {/* Underline */}
                    <span className="absolute bottom-1 right-4 left-4 h-0.5 bg-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right" />
                  </a>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {item.submenu && activeSubmenu === item.name && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute top-full right-0 bg-white shadow-elevated border-t-2 border-gold overflow-hidden ${
                          item.wide ? 'w-[480px]' : 'w-56'
                        }`}
                      >
                        <div className={`py-3 ${item.wide ? 'grid grid-cols-2 gap-x-4 px-2' : ''}`}>
                          {item.submenu.map((subItem, index) => (
                            <motion.a
                              key={subItem.name}
                              href={subItem.href}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className="block px-5 py-2.5 font-[family-name:var(--font-display)] text-sm text-charcoal hover:bg-cream hover:text-gold hover:pr-7 transition-all duration-200"
                            >
                              {subItem.name}
                            </motion.a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Search Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSearchOpen(true)}
                className="w-10 h-10 border border-sand hover:border-gold text-graphite hover:text-gold flex items-center justify-center transition-all duration-300"
                aria-label="بحث"
              >
                <Search size={18} />
              </motion.button>

              {/* Subscribe Button */}
              <motion.a
                href="/subscribe"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="hidden md:flex btn-gold items-center gap-2"
              >
                <span>اشترك الآن</span>
              </motion.a>

              {/* Mobile Menu Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 bg-obsidian text-gold flex items-center justify-center"
                aria-label="القائمة"
              >
                <Menu size={20} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-obsidian/95 flex items-start justify-center pt-32"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full max-w-3xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Label */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-gold" />
                <span className="text-gold font-[family-name:var(--font-display)] font-bold">البحث</span>
              </div>

              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث في الأخبار والمقالات..."
                  className="w-full px-8 py-6 text-xl bg-white/5 border border-gold/30 text-white font-[family-name:var(--font-display)] placeholder:text-white/60 focus:outline-none focus:border-gold transition-colors"
                  autoFocus
                />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gold" size={24} />
              </div>

              {/* Quick Links */}
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="text-white/70 text-sm font-[family-name:var(--font-display)]">الأكثر بحثاً:</span>
                {['أسهم', 'نفط', 'ذهب', 'عقارات', 'بنوك'].map((term) => (
                  <button
                    key={term}
                    className="px-4 py-1.5 border border-gold/20 text-gold/60 text-sm font-[family-name:var(--font-display)] hover:border-gold hover:text-gold transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsSearchOpen(false)}
                className="absolute top-4 left-4 w-12 h-12 border border-white/20 text-white/60 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                aria-label="إغلاق البحث"
              >
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[90] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-paper z-[95] lg:hidden shadow-dramatic"
            >
              <div className="flex flex-col h-full">
                {/* Mobile Menu Header */}
                <div className="flex items-center justify-between p-5 border-b border-sand">
                  <span className="font-[family-name:var(--font-display)] font-bold text-obsidian">القائمة</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-10 h-10 border border-sand text-graphite flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                    aria-label="إغلاق القائمة"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Mobile Menu Items */}
                <nav className="flex-1 overflow-y-auto py-4">
                  {navigation.map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <a
                        href={item.href}
                        className="flex items-center justify-between px-6 py-3.5 font-[family-name:var(--font-display)] font-semibold text-obsidian hover:bg-cream hover:text-gold transition-colors"
                      >
                        <span>{item.name}</span>
                        {item.submenu && <ChevronDown size={16} className="text-gold/50" />}
                      </a>
                      {item.submenu && (
                        <div className="bg-cream/50 border-r-2 border-gold/20 mr-4">
                          {item.submenu.slice(0, 6).map((subItem) => (
                            <a
                              key={subItem.name}
                              href={subItem.href}
                              className="block px-8 py-2.5 text-sm text-charcoal hover:text-gold transition-colors"
                            >
                              {subItem.name}
                            </a>
                          ))}
                          {item.submenu.length > 6 && (
                            <a
                              href={item.href}
                              className="block px-8 py-2.5 text-sm text-gold font-semibold"
                            >
                              عرض الكل ({item.submenu.length})
                            </a>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </nav>

                {/* Mobile Menu Footer */}
                <div className="p-5 border-t border-sand">
                  <a
                    href="/subscribe"
                    className="block w-full btn-gold text-center mb-5"
                  >
                    <span>اشترك الآن</span>
                  </a>
                  <div className="flex items-center justify-center gap-5">
                    {socialLinks.map((social) => (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-graphite hover:text-gold transition-colors"
                        aria-label={social.label}
                      >
                        <social.icon size={18} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
