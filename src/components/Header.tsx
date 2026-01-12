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
    name: 'قطاعات',
    href: '/sectors',
    submenu: [
      { name: 'اقتصاد عام', href: '/sectors/economy' },
      { name: 'مال ومصارف', href: '/sectors/finance' },
      { name: 'طاقة', href: '/sectors/energy' },
      { name: 'نفط وغاز', href: '/sectors/oil-gas' },
      { name: 'عقار وإنشاءات', href: '/sectors/real-estate' },
      { name: 'تكنولوجيا', href: '/sectors/technology' },
      { name: 'سياحة وطيران', href: '/sectors/tourism' },
      { name: 'سيارات ومحركات', href: '/sectors/automotive' },
    ]
  },
  {
    name: 'بلدان',
    href: '/countries',
    submenu: [
      { name: 'السعودية', href: '/countries/saudi' },
      { name: 'الإمارات', href: '/countries/uae' },
      { name: 'مصر', href: '/countries/egypt' },
      { name: 'لبنان', href: '/countries/lebanon' },
      { name: 'الكويت', href: '/countries/kuwait' },
      { name: 'قطر', href: '/countries/qatar' },
      { name: 'البحرين', href: '/countries/bahrain' },
      { name: 'عُمان', href: '/countries/oman' },
    ]
  },
  { name: 'بروفايل', href: '/profiles' },
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
    // Set date only on client to avoid hydration mismatch
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
      {/* Top Bar */}
      <div className="bg-navy text-white py-2 hidden lg:block">
        <div className="container-luxury flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-sm text-silver font-[family-name:var(--font-display)]">
              {currentDate}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-silver font-[family-name:var(--font-display)]">تابعنا على</span>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-silver hover:text-gold transition-colors duration-300"
                  aria-label={social.label}
                >
                  <social.icon size={16} />
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
            ? 'glass shadow-lg py-3'
            : 'bg-cream py-4'
        }`}
      >
        <div className="container-luxury">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.a
              href="/"
              className="flex items-center gap-3 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center shadow-gold">
                  <span className="text-white font-[family-name:var(--font-display)] font-black text-2xl">إ</span>
                </div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-navy rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-[family-name:var(--font-display)] font-black text-xl text-navy leading-tight">
                  الإقتصاد والأعمال
                </span>
                <span className="text-[10px] text-gold font-[family-name:var(--font-display)] tracking-wider uppercase">
                  Al-Iktissad Wal-Aamal
                </span>
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
                    className="flex items-center gap-1 px-4 py-2 font-[family-name:var(--font-display)] font-semibold text-navy hover:text-gold transition-colors duration-300 relative group"
                  >
                    <span>{item.name}</span>
                    {item.submenu && (
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-300 ${
                          activeSubmenu === item.name ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                    <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full"></span>
                  </a>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {item.submenu && activeSubmenu === item.name && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 w-56 bg-white rounded-lg shadow-xl border border-sand overflow-hidden"
                      >
                        <div className="py-2">
                          {item.submenu.map((subItem, index) => (
                            <motion.a
                              key={subItem.name}
                              href={subItem.href}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="block px-4 py-2.5 font-[family-name:var(--font-display)] text-sm text-charcoal hover:bg-cream hover:text-gold hover:pr-6 transition-all duration-200"
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
            <div className="flex items-center gap-3">
              {/* Search Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSearchOpen(true)}
                className="w-10 h-10 rounded-full bg-ivory hover:bg-sand flex items-center justify-center text-navy transition-colors duration-300"
                aria-label="بحث"
              >
                <Search size={18} />
              </motion.button>

              {/* Subscribe Button */}
              <motion.a
                href="/subscribe"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="hidden md:flex btn-gold"
              >
                <span>اشترك الآن</span>
              </motion.a>

              {/* Mobile Menu Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center"
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
            className="fixed inset-0 z-[100] bg-navy/95 flex items-start justify-center pt-32"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full max-w-2xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث في الأخبار والمقالات..."
                  className="w-full px-6 py-5 pr-14 text-xl bg-white rounded-lg font-[family-name:var(--font-display)] text-navy placeholder:text-silver focus:outline-none focus:ring-4 focus:ring-gold/30"
                  autoFocus
                />
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gold" size={24} />
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="absolute top-4 left-4 text-white/60 hover:text-white transition-colors"
                aria-label="إغلاق البحث"
              >
                <X size={32} />
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
              className="fixed inset-0 bg-black/50 z-[90] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-white z-[95] lg:hidden shadow-2xl"
            >
              <div className="flex flex-col h-full">
                {/* Mobile Menu Header */}
                <div className="flex items-center justify-between p-4 border-b border-sand">
                  <span className="font-[family-name:var(--font-display)] font-bold text-navy">القائمة</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-10 h-10 rounded-full bg-ivory flex items-center justify-center text-navy"
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
                      transition={{ delay: index * 0.1 }}
                    >
                      <a
                        href={item.href}
                        className="flex items-center justify-between px-6 py-3 font-[family-name:var(--font-display)] font-semibold text-navy hover:bg-cream hover:text-gold transition-colors"
                      >
                        <span>{item.name}</span>
                        {item.submenu && <ChevronDown size={16} />}
                      </a>
                      {item.submenu && (
                        <div className="bg-ivory">
                          {item.submenu.map((subItem) => (
                            <a
                              key={subItem.name}
                              href={subItem.href}
                              className="block px-8 py-2.5 text-sm text-charcoal hover:text-gold transition-colors"
                            >
                              {subItem.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </nav>

                {/* Mobile Menu Footer */}
                <div className="p-4 border-t border-sand">
                  <a
                    href="/subscribe"
                    className="block w-full btn-gold text-center mb-4"
                  >
                    <span>اشترك الآن</span>
                  </a>
                  <div className="flex items-center justify-center gap-4">
                    {socialLinks.map((social) => (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate hover:text-gold transition-colors"
                        aria-label={social.label}
                      >
                        <social.icon size={20} />
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
