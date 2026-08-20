/**
 * Header Component
 * IKTISSAD Design System
 *
 * Main navigation header with search, mobile menu, language switcher, and responsive design.
 * Uses design tokens and i18n for internationalization.
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Article, Section, Sector, ApiResponse } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import {
  Menu,
  X,
  Search,
  ChevronDown,
  Facebook,
  Instagram,
  Linkedin,
  Youtube
} from 'lucide-react';
import { XIcon } from '@/components/icons/SocialIcons';
import { useTranslation } from '@/lib/i18n';
import { config, iconSizes, animations } from '@/lib/design-tokens';
import PushNotificationToggle from '@/components/PushNotificationToggle';
import { COUNTRY_REGIONS } from '@/lib/countries';

// ═══════════════════════════════════════════════════════════════
// NAVIGATION DATA
// ═══════════════════════════════════════════════════════════════

interface NavSubItem {
  key: string;
  href: string;
  label?: string; // pre-resolved label (when sourced from DB)
}

interface NavItem {
  key: string;
  href: string;
  wide?: boolean;
  submenu?: NavSubItem[];
}

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/iktissad', label: 'Facebook' },
  { icon: XIcon, href: 'https://x.com/iktissad', label: 'X' },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch sections + sectors from DB. Long deduping interval — these change rarely.
  const swrOpts = { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 };
  const { data: sectionsResp } = useSWR<ApiResponse<Section[]>>('/api/sections', swrFetcher, swrOpts);
  const { data: sectorsResp }  = useSWR<ApiResponse<Sector[]>>('/api/sectors',  swrFetcher, swrOpts);

  // Live section names, so a rename in the CMS reaches the nav without a deploy.
  const sectionNameBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const sec of sectionsResp?.data ?? []) {
      m.set(sec.slug, locale === 'ar' ? sec.name : (sec.nameEn || sec.name));
    }
    return m;
  }, [sectionsResp, locale]);

  const dynamicSectors: NavSubItem[] = useMemo(() =>
    (sectorsResp?.data ?? []).map(s => ({
      key: s.slug,
      href: `/industries/${s.slug}`,
      label: locale === 'ar' ? s.name : (s.nameEn || s.name),
    })), [sectorsResp, locale]);

  const regionItems: NavSubItem[] = useMemo(() =>
    COUNTRY_REGIONS.map(r => ({
      key: r,
      href: `/countries/region/${r}`,
      label: t(`nav.regions.${r}`),
    })), [t]);

  // The 15 أبواب, in editorial order. Twelve are sections; تحت المجهر is the
  // sectors taxonomy, جغرافيا الاقتصاد is countries by region, and أبرز
  // المواضيع is the homepage.
  const navigationConfig: NavItem[] = useMemo(() => [
    { key: 'home',      href: '/' },
    { key: 'analysis',  href: '/topics/analysis' },
    { key: 'economy',   href: '/topics/economy' },
    { key: 'markets',   href: '/topics/markets' },
    { key: 'business',  href: '/topics/business' },
    { key: 'companies', href: '/topics/companies' },
    { key: 'sectors',   href: '/industries', wide: true, submenu: dynamicSectors },
    { key: 'files',     href: '/topics/files' },
    { key: 'leaders',   href: '/topics/leaders' },
    { key: 'numbers',   href: '/topics/numbers' },
    { key: 'opinion',   href: '/topics/opinion' },
    { key: 'videos',    href: '/topics/videos' },
    { key: 'events',    href: '/topics/events' },
    { key: 'society',   href: '/topics/society' },
    { key: 'geography', href: '/countries', submenu: regionItems },
  ], [dynamicSectors, regionItems]);

  // Prefer the live section name; fall back to the bundled translation while
  // /api/sections is still in flight (and for the three non-section أبواب).
  const getNavName = (key: string): string =>
    sectionNameBySlug.get(key) || t(`nav.main.${key}`);

  // Submenu label: prefer DB-provided label, else fall back to slug
  const getSubmenuName = (item: NavSubItem): string => item.label || item.key;

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
      const y = window.scrollY;
      // Hysteresis: collapse at 100px, expand only when back below 30px.
      // Prevents the header size-change from pushing content and oscillating.
      setIsScrolled(prev => (prev ? y > 30 : y > 100));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
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

  // Fetch trending articles when search modal opens
  useEffect(() => {
    if (!isSearchOpen) {
      // Only clear when transitioning from open → closed (guard avoids cascading renders)
      setSearchQuery((prev) => (prev === '' ? prev : ''));
      setSearchResults((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    fetch('/api/search/trending?limit=5')
      .then(r => r.json())
      .then(json => setTrendingArticles(json.data ?? []))
      .catch(() => {});
  }, [isSearchOpen]);

  // Debounced search
  const runSearch = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}&pageSize=6`)
      .then(r => r.json())
      .then(json => { setSearchResults(json.data ?? []); setIsSearching(false); })
      .catch(() => setIsSearching(false));
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => runSearch(searchQuery), 350);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, runSearch]);

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
            ? 'bg-paper shadow-elevated'
            : 'bg-paper'
        }`}
      >
        {/* Logo Row — centered, nothing beside it */}
        <div className={`flex items-center justify-center transition-all duration-500 ${
          isScrolled ? 'py-2 border-b border-sand/60' : 'py-5 border-b border-sand'
        }`}>
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
            {/* Hamburger — mobile only, inline-start = right in RTL */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-9 h-9 bg-obsidian text-gold flex items-center justify-center"
              aria-label={isMobileMenuOpen ? t('header.menu.close') : t('a11y.openMenu')}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isMobileMenuOpen ? (
                  <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X size={iconSizes.lg} />
                  </motion.span>
                ) : (
                  <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu size={iconSizes.lg} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>


            {/* Actions */}
            <div className="flex items-center gap-3 ms-auto lg:ms-0">
              {/* Not أبواب, but they still need a way in */}
              <div className="hidden lg:flex items-center gap-4 me-2">
                <Link
                  href="/magazine"
                  className="font-[family-name:var(--font-display)] text-[13px] font-semibold text-graphite hover:text-gold transition-colors"
                >
                  {t('nav.main.magazine')}
                </Link>
                <Link
                  href="/about"
                  className="font-[family-name:var(--font-display)] text-[13px] font-semibold text-graphite hover:text-gold transition-colors"
                >
                  {t('nav.main.group')}
                </Link>
              </div>

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

              {/* Push Notification Toggle */}
              <div className="hidden md:block">
                <PushNotificationToggle />
              </div>

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

        {/* الأبواب strip */}
        <div className="hidden lg:block border-t border-sand/60 bg-paper">
          <div className="container-editorial">
          {/* الأبواب — the 15 top-level sections, on their own strip */}
          <nav className="hidden lg:flex flex-wrap items-center justify-center gap-x-0.5">
            {navigationConfig.map((item) => (
              <div
                key={item.key}
                className="relative"
                onMouseEnter={() => item.submenu && setActiveSubmenu(item.key)}
                onMouseLeave={() => setActiveSubmenu(null)}
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-1 px-2.5 py-2 font-[family-name:var(--font-display)] font-semibold text-[13px] whitespace-nowrap text-ink hover:text-gold transition-colors duration-300 relative group"
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
                  <span className="absolute bottom-1 start-2.5 end-2.5 h-0.5 bg-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-[100%_50%] rtl:origin-[0%_50%]" />
                </Link>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {item.submenu && activeSubmenu === item.key && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: animations.durationMs.fast / 1000 }}
                      className={`absolute top-full start-0 bg-paper shadow-elevated border-t-2 border-gold overflow-hidden`}
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
                              className="block px-5 py-2.5 font-[family-name:var(--font-display)] text-sm text-charcoal hover:bg-cream hover:text-gold hover:ps-7 transition-all duration-200"
                            >
                              {getSubmenuName(subItem)}
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
          </div>
        </div>

        {/* Mobile Nav Dropdown — collapses below the logo row */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden overflow-hidden border-t border-sand"
            >
              <nav className="overflow-y-auto max-h-[70vh] py-4 bg-paper">
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
                      className="flex items-center justify-between px-6 py-3.5 font-[family-name:var(--font-display)] font-semibold text-ink hover:bg-cream hover:text-gold transition-colors"
                    >
                      <span>{getNavName(item.key)}</span>
                      {item.submenu && <ChevronDown size={iconSizes.sm} className="text-gold/50" />}
                    </Link>
                    {item.submenu && (
                      <div className="bg-cream/50 ms-4">
                        {item.submenu.map((subItem) => (
                          <Link
                            key={subItem.key}
                            href={subItem.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-8 py-2.5 text-sm text-charcoal hover:text-gold transition-colors"
                          >
                            {getSubmenuName(subItem)}
                          </Link>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </nav>
              <div className="bg-paper px-5 py-4 border-t border-sand">
                <Link
                  href="/subscribe"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full btn-gold text-center mb-4"
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
            </motion.div>
          )}
        </AnimatePresence>
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
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('header.search.placeholder')}
                  className="w-full px-8 py-6 text-xl bg-white/5 border border-gold/30 text-white font-[family-name:var(--font-display)] placeholder:text-white/60 focus:outline-none focus:border-gold transition-colors"
                  autoFocus
                />
                <Search className="absolute end-6 top-1/2 -translate-y-1/2 text-gold" size={iconSizes.lg} />
              </div>

              {/* Results */}
              {searchQuery.trim() ? (
                <div className="mt-4 space-y-0 max-h-[40vh] overflow-y-auto">
                  {isSearching && (
                    <div className="py-8 text-center text-white/50 text-sm font-[family-name:var(--font-display)]">
                      جارٍ البحث...
                    </div>
                  )}
                  {!isSearching && searchResults.length === 0 && (
                    <div className="py-8 text-center text-white/50 text-sm font-[family-name:var(--font-display)]">
                      لا نتائج لـ «{searchQuery}»
                    </div>
                  )}
                  {!isSearching && searchResults.map(article => (
                    <Link
                      key={article.id}
                      href={`/${article.slug}`}
                      onClick={() => setIsSearchOpen(false)}
                      className="flex gap-4 p-3 border-b border-white/10 hover:bg-white/5 transition-colors group"
                    >
                      {article.featuredImage && (
                        <div className="relative w-14 h-14 shrink-0">
                          <Image src={article.featuredImage} alt="" fill className="object-cover opacity-80 group-hover:opacity-100" sizes="56px" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-[family-name:var(--font-display)] leading-snug line-clamp-2 group-hover:text-gold transition-colors">
                          {article.title}
                        </p>
                        {article.section && (
                          <p className="text-gold/50 text-xs mt-1">{article.section}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                /* Trending keywords + trending articles when no query */
                <>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <span className="text-white/70 text-sm font-[family-name:var(--font-display)]">
                      {t('header.search.trending')}
                    </span>
                    {(['أسهم', 'نفط', 'ذهب', 'عقارات', 'بنوك'] as string[]).map((term: string) => (
                      <button
                        key={term}
                        onClick={() => setSearchQuery(term)}
                        className="px-4 py-1.5 border border-gold/20 text-gold/60 text-sm font-[family-name:var(--font-display)] hover:border-gold hover:text-gold transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                  {trendingArticles.length > 0 && (
                    <div className="mt-4 space-y-0 max-h-[32vh] overflow-y-auto">
                      {trendingArticles.map(article => (
                        <Link
                          key={article.id}
                          href={`/${article.slug}`}
                          onClick={() => setIsSearchOpen(false)}
                          className="flex gap-4 p-3 border-b border-white/10 hover:bg-white/5 transition-colors group"
                        >
                          {article.featuredImage && (
                            <div className="relative w-12 h-12 shrink-0">
                              <Image src={article.featuredImage} alt="" fill className="object-cover opacity-70 group-hover:opacity-100" sizes="48px" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white/80 text-sm font-[family-name:var(--font-display)] leading-snug line-clamp-2 group-hover:text-gold transition-colors">
                              {article.title}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Close Button */}
              <button
                onClick={() => setIsSearchOpen(false)}
                className="absolute top-4 end-4 w-12 h-12 border border-white/20 text-white/60 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                aria-label={t('header.search.close')}
              >
                <X size={iconSizes.lg} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
