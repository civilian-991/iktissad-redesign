/**
 * Footer Component
 * IKTISSAD Design System
 *
 * Main site footer with navigation links, contact info, and social links.
 * Uses design tokens and i18n for internationalization.
 */

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
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';

// ═══════════════════════════════════════════════════════════════
// FOOTER LINK CONFIGURATION
// ═══════════════════════════════════════════════════════════════

interface FooterLink {
  key: string;
  href: string;
  external?: boolean;
}

const footerLinksConfig = {
  sections: [
    { key: 'economy', href: '/sections/economy' },
    { key: 'companies', href: '/sections/companies' },
    { key: 'markets', href: '/sections/markets' },
    { key: 'technology', href: '/sections/technology' },
    { key: 'energy', href: '/sections/energy-innovation' },
    { key: 'opinion', href: '/sections/opinion' },
    { key: 'files', href: '/sections/files' },
    { key: 'video', href: '/sections/video' },
  ],
  sectors: [
    { key: 'industry', href: '/sectors/industry' },
    { key: 'agriculture', href: '/sectors/agriculture' },
    { key: 'trade', href: '/sectors/trade' },
    { key: 'banking', href: '/sectors/finance' },
    { key: 'investment', href: '/sectors/investment' },
    { key: 'realEstate', href: '/sectors/real-estate' },
    { key: 'tourism', href: '/sectors/tourism-entertainment' },
    { key: 'energyEnv', href: '/sectors/energy-environment' },
  ],
  group: [
    { key: 'magazine', href: '#', external: true },
    { key: 'arabMarkets', href: '#', external: true },
    { key: 'banking', href: '#', external: true },
    { key: 'businessLeaders', href: '#', external: true },
  ],
  about: [
    { key: 'aboutUs', href: '/about' },
    { key: 'team', href: '/team' },
    { key: 'contactUs', href: '/contact' },
    { key: 'advertise', href: '/advertise' },
  ]
};

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

export default function Footer() {
  const { t } = useTranslation();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Get section link name from translations
  const getSectionName = (key: string): string => {
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
    return sectionKeys[key] || key;
  };

  // Get sector link name from translations
  const getSectorName = (key: string): string => {
    const sectorKeys: Record<string, string> = {
      industry: t('nav.sectors.industry'),
      agriculture: t('nav.sectors.agriculture'),
      trade: t('nav.sectors.trade'),
      banking: t('nav.sectors.banking'),
      investment: t('nav.sectors.investment'),
      realEstate: t('nav.sectors.realEstate'),
      tourism: t('nav.sectors.tourism'),
      energyEnv: t('nav.sectors.energyEnv'),
    };
    return sectorKeys[key] || key;
  };

  // Get group link name from translations
  const getGroupName = (key: string): string => {
    const groupKeys: Record<string, string> = {
      magazine: t('nav.group.magazine'),
      arabMarkets: t('nav.group.arabMarkets'),
      banking: t('nav.group.banking'),
      businessLeaders: t('nav.group.businessLeaders'),
    };
    return groupKeys[key] || key;
  };

  // Get about link name from translations
  const getAboutName = (key: string): string => {
    const aboutKeys: Record<string, string> = {
      aboutUs: t('nav.footer.aboutUs'),
      team: t('nav.footer.team'),
      contactUs: t('nav.footer.contactUs'),
      advertise: t('nav.footer.advertise'),
    };
    return aboutKeys[key] || key;
  };

  return (
    <footer className="relative overflow-hidden">
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
                    {t('common.brand.name')}
                  </span>
                  <span className="text-xs text-gold font-[family-name:var(--font-accent)] tracking-[0.15em] mt-1">
                    {t('common.brand.nameEn')}
                  </span>
                </div>
              </motion.a>

              <p className="text-white/70 text-base leading-relaxed mb-10 max-w-sm font-[family-name:var(--font-body)]">
                {t('common.brand.description')}
              </p>

              {/* Contact Info */}
              <div className="space-y-4">
                <a href="mailto:info@iktissadonline.com" className="flex items-center gap-4 text-white/70 hover:text-gold transition-colors group">
                  <div className="w-10 h-10 border border-gold/20 flex items-center justify-center group-hover:border-gold transition-colors">
                    <Mail size={iconSizes.md} className="text-gold" />
                  </div>
                  <span className="text-sm">info@iktissadonline.com</span>
                </a>
                <a href="tel:+9611000000" className="flex items-center gap-4 text-white/70 hover:text-gold transition-colors group">
                  <div className="w-10 h-10 border border-gold/20 flex items-center justify-center group-hover:border-gold transition-colors">
                    <Phone size={iconSizes.md} className="text-gold" />
                  </div>
                  <span className="text-sm" dir="ltr">+961 1 000 000</span>
                </a>
                <div className="flex items-center gap-4 text-white/70">
                  <div className="w-10 h-10 border border-gold/20 flex items-center justify-center">
                    <MapPin size={iconSizes.md} className="text-gold" />
                  </div>
                  <span className="text-sm">{t('common.brand.location')}</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-10">
                <span className="text-xs text-white/60 font-[family-name:var(--font-display)] block mb-4">
                  {t('common.labels.followOn')}
                </span>
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
                      <social.icon size={iconSizes.md} />
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
                    <span className="text-gold">{t('nav.main.sections')}</span>
                  </h4>
                  <ul className="space-y-3">
                    {footerLinksConfig.sections.map((link) => (
                      <li key={link.key}>
                        <a
                          href={link.href}
                          className="text-sm text-white/70 hover:text-gold hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                        >
                          <span className="w-1 h-1 bg-gold/30 group-hover:bg-gold transition-colors" />
                          {getSectionName(link.key)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sectors */}
                <div>
                  <h4 className="font-[family-name:var(--font-display)] font-bold text-lg mb-6 flex items-center gap-3">
                    <span className="w-1 h-5 bg-gold" />
                    <span className="text-gold">{t('nav.main.sectors')}</span>
                  </h4>
                  <ul className="space-y-3">
                    {footerLinksConfig.sectors.map((link) => (
                      <li key={link.key}>
                        <a
                          href={link.href}
                          className="text-sm text-white/70 hover:text-gold hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                        >
                          <span className="w-1 h-1 bg-gold/30 group-hover:bg-gold transition-colors" />
                          {getSectorName(link.key)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Group Publications */}
                <div>
                  <h4 className="font-[family-name:var(--font-display)] font-bold text-lg mb-6 flex items-center gap-3">
                    <span className="w-1 h-5 bg-gold" />
                    <span className="text-gold">{t('nav.main.group')}</span>
                  </h4>
                  <ul className="space-y-3">
                    {footerLinksConfig.group.map((link) => (
                      <li key={link.key}>
                        <a
                          href={link.href}
                          target={link.external ? '_blank' : undefined}
                          rel={link.external ? 'noopener noreferrer' : undefined}
                          className="text-sm text-white/70 hover:text-gold hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                        >
                          <span className="w-1 h-1 bg-gold/30 group-hover:bg-gold transition-colors" />
                          {getGroupName(link.key)}
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
                    <span className="text-gold">{t('nav.footer.aboutUs')}</span>
                  </h4>
                  <ul className="space-y-3">
                    {footerLinksConfig.about.map((link) => (
                      <li key={link.key}>
                        <a
                          href={link.href}
                          className="text-sm text-white/70 hover:text-gold hover:pr-2 transition-all duration-200 flex items-center gap-2 group"
                        >
                          <span className="w-1 h-1 bg-gold/30 group-hover:bg-gold transition-colors" />
                          {getAboutName(link.key)}
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
                {new Date().getFullYear()} {t('legal.copyright', { brand: t('common.brand.name') })}
              </p>
              <div className="flex items-center gap-6 text-white/60 text-xs">
                <a href="/privacy" className="hover:text-gold transition-colors">
                  {t('legal.privacy')}
                </a>
                <span className="w-1 h-1 bg-gold/30 rounded-full" />
                <a href="/terms" className="hover:text-gold transition-colors">
                  {t('legal.terms')}
                </a>
              </div>
            </div>

            {/* Back to Top */}
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group flex items-center gap-3 border border-gold/30 hover:border-gold text-gold px-6 py-3 transition-all duration-300"
              aria-label={t('common.actions.backToTop')}
            >
              <span className="font-[family-name:var(--font-display)] font-semibold text-sm">
                {t('common.actions.backToTop')}
              </span>
              <ChevronUp size={iconSizes.md} className="group-hover:-translate-y-1 transition-transform" />
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
              {t('nav.group.magazine')}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/30 rotate-45" />
              {t('nav.group.arabMarkets')}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/30 rotate-45" />
              {t('nav.group.banking')}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/30 rotate-45" />
              {t('nav.group.businessLeaders')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
