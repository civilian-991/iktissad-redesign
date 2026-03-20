/**
 * Header Component
 * IKTISSAD Design System
 *
 * Main navigation header with search, mobile menu, language switcher, and responsive design.
 * Uses design tokens and i18n for internationalization.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
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
import { useTranslation } from '@/lib/i18n';
import { config, iconSizes, animations } from '@/lib/design-tokens';
import BreakingNewsTicker from '@/components/BreakingNewsTicker';

// ═══════════════════════════════════════════════════════════════
// NAVIGATION DATA
// ═══════════════════════════════════════════════════════════════

interface NavItem {
  key: string;
  href: string;
  wide?: boolean;
  submenu?: { key: string; href: string }[];
}

const navigationConfig: NavItem[] = [
  { key: 'home', href: '/' },
  {
    key: 'sections',
    href: '/sections',
    submenu: [
      { key: 'economy', href: '/sections/economy' },
      { key: 'companies', href: '/sections/companies' },
      { key: 'markets', href: '/sections/markets' },
      { key: 'technology', href: '/sections/technology' },
      { key: 'energy', href: '/sections/energy-innovation' },
      { key: 'opinion', href: '/sections/opinion' },
      { key: 'files', href: '/sections/files' },
      { key: 'video', href: '/sections/video' },
    ]
  },
  {
    key: 'sectors',
    href: '/sectors',
    wide: true,
    submenu: [
      { key: 'industry', href: '/sectors/industry' },
      { key: 'agriculture', href: '/sectors/agriculture' },
      { key: 'trade', href: '/sectors/trade' },
      { key: 'banking', href: '/sectors/finance' },
      { key: 'investment', href: '/sectors/investment' },
      { key: 'insurance', href: '/sectors/insurance' },
      { key: 'realEstate', href: '/sectors/real-estate' },
      { key: 'transport', href: '/sectors/transport' },
      { key: 'automotive', href: '/sectors/automotive' },
      { key: 'tourism', href: '/sectors/tourism-entertainment' },
      { key: 'education', href: '/sectors/education' },
      { key: 'health', href: '/sectors/health' },
      { key: 'energyEnv', href: '/sectors/energy-environment' },
      { key: 'innovation', href: '/sectors/entrepreneurship' },
      { key: 'luxury', href: '/sectors/luxury' },
      { key: 'wealth', href: '/sectors/wealth' },
    ]
  },
  { key: 'magazine', href: '/magazine' },
  { key: 'group', href: '/group' },
];

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/iktissad', label: 'Facebook' },
  { icon: Twitter, href: 'https://twitter.com/iktissad', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com/iktissad', label: 'Instagram' },
  { icon: Linkedin, href: 'https://linkedin.com/company/iktissad', label: 'LinkedIn' },
  { icon: Youtube, href: 'https://youtube.com/iktissad', label: 'YouTube' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function Header() {
  const { t, locale } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('');

  // Get navigation item name from translations
  const getNavName = (key: string): string => {
    const navKeys: Record<string, string> = {
      home: t('nav.main.home'),
      sections: t('nav.main.sections'),
      sectors: t('nav.main.sectors'),
      magazine: t('nav.main.magazine'),
      group: t('nav.main.group'),
    };
    return navKeys[key] || key;
  };

  // Get submenu item name from translations
  const getSubmenuName = (parentKey: string, itemKey: string): string => {
    if (parentKey === 'sections') {
      const sectionKeys: Record<string, string> = {
        economy: t('nav.sections.economy'),
        companies: t('nav.sections.companies'),
        markets: t('nav.sections.markets'),
        technology: t('nav.sections.technology'),
        energy: t('nav.sections.energy'),
        opinion: t('nav.sections.opinion'),
        files: t('nav.sections.files'),
        video: t('nav.sections.video'),
      };
      return sectionKeys[itemKey] || itemKey;
    }
    if (parentKey === 'sectors') {
      const sectorKeys: Record<string, string> = {
        industry: t('nav.sectors.industry'),
        agriculture: t('nav.sectors.agriculture'),
        trade: t('nav.sectors.trade'),
        banking: t('nav.sectors.banking'),
        investment: t('nav.sectors.investment'),
        insurance: t('nav.sectors.insurance'),
        realEstate: t('nav.sectors.realEstate'),
        transport: t('nav.sectors.transport'),
        automotive: t('nav.sectors.automotive'),
        tourism: t('nav.sectors.tourism'),
        education: t('nav.sectors.education'),
        health: t('nav.sectors.health'),
        energyEnv: t('nav.sectors.energyEnv'),
        innovation: t('nav.sectors.innovation'),
        luxury: t('nav.sectors.luxury'),
        wealth: t('nav.sectors.wealth'),
      };
      return sectorKeys[itemKey] || itemKey;
    }
    return itemKey;
  };

  useEffect(() => {
    const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';
    setCurrentDate(new Date().toLocaleDateString(dateLocale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));
  }, [locale]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
              {t('common.brand.tagline')}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-xs text-white/70 font-[family-name:var(--font-display)]">
              {t('common.labels.followUs')}
            </span>
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
                  <social.icon size={iconSizes.sm} />
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
            ? 'glass-light shadow-elevated'
            : 'bg-paper'
        }`}
      >
        {/* Logo Row — centered, nothing beside it */}
        <div className={`flex items-center justify-center transition-all duration-500 ${
          isScrolled ? 'py-2 border-b border-sand/60' : 'py-5 border-b border-sand'
        }`}>
          {/* Mobile Menu Button — absolute left so it doesn't displace logo */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden absolute start-4 w-10 h-10 bg-obsidian text-gold flex items-center justify-center"
            aria-label={t('a11y.openMenu')}
          >
            <Menu size={iconSizes.lg} />
          </motion.button>

          <Link href="/" className="flex items-center group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Image
                src="/logo.png"
                alt={`${t('common.brand.name')} - ${t('common.brand.nameEn')}`}
                width={280}
                height={60}
                className={`w-auto transition-all duration-500 ${
                  isScrolled ? 'h-10 md:h-12' : 'h-14 md:h-16'
                }`}
                priority
              />
            </motion.div>
          </Link>
        </div>

        {/* Nav Row — menu + actions */}
        <div className="container-editorial">
          <div className="flex items-center justify-between py-1.5">
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigationConfig.map((item) => (
                <div
                  key={item.key}
                  className="relative"
                  onMouseEnter={() => item.submenu && setActiveSubmenu(item.key)}
                  onMouseLeave={() => setActiveSubmenu(null)}
                >
                  <Link
                    href={item.href}
                    className="flex items-center gap-1.5 px-4 py-2 font-[family-name:var(--font-display)] font-semibold text-sm text-obsidian hover:text-gold transition-colors duration-300 relative group"
                  >
                    <span>{getNavName(item.key)}</span>
                    {item.submenu && (
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-300 ${
                          activeSubmenu === item.key ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                    <span className="absolute bottom-1 right-4 left-4 h-0.5 bg-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right" />
                  </Link>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {item.submenu && activeSubmenu === item.key && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: animations.durationMs.fast / 1000 }}
                        className={`absolute top-full right-0 bg-paper shadow-elevated border-t-2 border-gold overflow-hidden`}
                        style={{ width: item.wide ? config.submenu.wideWidth : config.submenu.normalWidth }}
                      >
                        <div className={`py-3 ${item.wide ? 'grid grid-cols-2 gap-x-4 px-2' : ''}`}>
                          {item.submenu.map((subItem, index) => (
                            <motion.div
                              key={subItem.key}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * config.stagger.fast }}
                            >
                              <Link
                                href={subItem.href}
                                className="block px-5 py-2.5 font-[family-name:var(--font-display)] text-sm text-charcoal hover:bg-cream hover:text-gold hover:pr-7 transition-all duration-200"
                              >
                                {getSubmenuName(item.key, subItem.key)}
                              </Link>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3 ms-auto lg:ms-0">
              {/* Search Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSearchOpen(true)}
                className="w-9 h-9 border border-sand hover:border-gold text-graphite hover:text-gold flex items-center justify-center transition-all duration-300"
                aria-label={t('common.actions.search')}
              >
                <Search size={iconSizes.md} />
              </motion.button>

              {/* Subscribe Button */}
              <Link
                href="/subscribe"
                className="hidden md:flex btn-gold items-center gap-2"
              >
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('common.actions.subscribe')}
                </motion.span>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Breaking News Ticker — sits immediately below the sticky header */}
      <BreakingNewsTicker />

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
              className="w-full mx-4"
              style={{ maxWidth: config.searchModal.maxWidth }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Label */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-gold" />
                <span className="text-gold font-[family-name:var(--font-display)] font-bold">
                  {t('header.search.label')}
                </span>
              </div>

              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('header.search.placeholder')}
                  className="w-full px-8 py-6 text-xl bg-white/5 border border-gold/30 text-white font-[family-name:var(--font-display)] placeholder:text-white/60 focus:outline-none focus:border-gold transition-colors"
                  autoFocus
                />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gold" size={iconSizes.lg} />
              </div>

              {/* Quick Links */}
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="text-white/70 text-sm font-[family-name:var(--font-display)]">
                  {t('header.search.trending')}
                </span>
                {(t('header.search.trendingTerms') as unknown as string[]).map((term: string) => (
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
                aria-label={t('header.search.close')}
              >
                <X size={iconSizes.lg} />
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
              className="fixed inset-0 bg-obsidian/60 z-[90] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: locale === 'ar' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: locale === 'ar' ? '100%' : '-100%' }}
              transition={{ type: "spring", damping: 25 }}
              className={`fixed top-0 ${locale === 'ar' ? 'right-0' : 'left-0'} bottom-0 bg-paper z-[95] lg:hidden shadow-dramatic`}
              style={{ width: config.mobileMenu.width }}
            >
              <div className="flex flex-col h-full">
                {/* Mobile Menu Header */}
                <div className="flex items-center justify-between p-5 border-b border-sand">
                  <span className="font-[family-name:var(--font-display)] font-bold text-obsidian">
                    {t('header.menu.label')}
                  </span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-10 h-10 border border-sand text-graphite flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                    aria-label={t('header.menu.close')}
                  >
                    <X size={iconSizes.lg} />
                  </button>
                </div>

                {/* Mobile Menu Items */}
                <nav className="flex-1 overflow-y-auto py-4">
                  {navigationConfig.map((item, index) => (
                    <motion.div
                      key={item.key}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * config.stagger.fast }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between px-6 py-3.5 font-[family-name:var(--font-display)] font-semibold text-obsidian hover:bg-cream hover:text-gold transition-colors"
                      >
                        <span>{getNavName(item.key)}</span>
                        {item.submenu && <ChevronDown size={iconSizes.sm} className="text-gold/50" />}
                      </Link>
                      {item.submenu && (
                        <div className="bg-cream/50 border-r-2 border-gold/20 mr-4">
                          {item.submenu.slice(0, 6).map((subItem) => (
                            <Link
                              key={subItem.key}
                              href={subItem.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="block px-8 py-2.5 text-sm text-charcoal hover:text-gold transition-colors"
                            >
                              {getSubmenuName(item.key, subItem.key)}
                            </Link>
                          ))}
                          {item.submenu.length > 6 && (
                            <Link
                              href={item.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="block px-8 py-2.5 text-sm text-gold font-semibold"
                            >
                              {t('common.actions.viewAll')} ({item.submenu.length})
                            </Link>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </nav>

                {/* Mobile Menu Footer */}
                <div className="p-5 border-t border-sand">
                  <Link
                    href="/subscribe"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full btn-gold text-center mb-5"
                  >
                    <span>{t('common.actions.subscribe')}</span>
                  </Link>
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
                        <social.icon size={iconSizes.md} />
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
