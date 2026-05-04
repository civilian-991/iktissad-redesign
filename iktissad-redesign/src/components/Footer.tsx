/**
 * Footer Component
 * IKTISSAD Design System
 *
 * Main site footer with navigation links, contact info, and social links.
 * Uses design tokens and i18n for internationalization.
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Section, Sector, ApiResponse } from '@/types';
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
  label?: string;
  external?: boolean;
}

const aboutLinks: FooterLink[] = [
  { key: 'aboutUs', href: '/about' },
  { key: 'team', href: '/team' },
  { key: 'contactUs', href: '/contact' },
  { key: 'advertise', href: '/advertise' },
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

export default function Footer() {
  const { t, locale } = useTranslation();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const swrOpts = { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 };
  const { data: sectionsResp } = useSWR<ApiResponse<Section[]>>('/api/sections', swrFetcher, swrOpts);
  const { data: sectorsResp }  = useSWR<ApiResponse<Sector[]>>('/api/sectors',  swrFetcher, swrOpts);

  const sectionLinks: FooterLink[] = useMemo(() =>
    (sectionsResp?.data ?? []).map(s => ({
      key: s.slug,
      href: `/topics/${s.slug}`,
      label: locale === 'ar' ? s.name : (s.nameEn || s.name),
    })), [sectionsResp, locale]);

  // Footer shows a curated subset of sectors (top 8 by article count if available)
  const sectorLinks: FooterLink[] = useMemo(() => {
    const all = sectorsResp?.data ?? [];
    const top = [...all].sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0)).slice(0, 8);
    return top.map(s => ({
      key: s.slug,
      href: `/industries/${s.slug}`,
      label: locale === 'ar' ? s.name : (s.nameEn || s.name),
    }));
  }, [sectorsResp, locale]);

  // Resolve label for a footer link, falling back to slug
  const getLinkLabel = (link: FooterLink): string => link.label || link.key;

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
      <div className="bg-obsidian text-white relative overflow-hidden pt-8">
        {/* Pattern Overlay */}
        <div className="absolute inset-0 pattern-arabesque opacity-20" />

        {/* Gold Line Top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

        <div className="container-editorial relative py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Brand Column */}
            <div className="lg:col-span-4">
              <Link
                href="/"
                className="flex items-center gap-4 mb-10"
              >
                <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-4">
                  {/* Logo Icon */}
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-gold via-gold-muted to-bronze flex items-center justify-center shadow-gold p-2.5">
                      <Image
                        src="/iktissad-icon.png"
                        alt=""
                        width={40}
                        height={40}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="absolute -bottom-1 -end-1 w-4 h-4 border-b-2 border-e-2 border-gold" />
                  </div>
                  {/* Logo Text */}
                  <Image
                    src="/footer-logo.png"
                    alt={`${t('common.brand.name')} - ${t('common.brand.nameEn')}`}
                    width={180}
                    height={48}
                    className="h-10 w-auto"
                  />
                </motion.div>
              </Link>

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
                <a href="tel:+9611353577" className="flex items-center gap-4 text-white/70 hover:text-gold transition-colors group">
                  <div className="w-10 h-10 border border-gold/20 flex items-center justify-center group-hover:border-gold transition-colors">
                    <Phone size={iconSizes.md} className="text-gold" />
                  </div>
                  <span className="text-sm" dir="ltr">+961 1 353 577</span>
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
                    {sectionLinks.map((link) => (
                      <li key={link.key}>
                        <Link
                          href={link.href}
                          className="text-sm text-white/70 hover:text-gold hover:ps-2 transition-all duration-200 flex items-center gap-2 group"
                        >
                          <span className="w-1 h-1 bg-gold/30 group-hover:bg-gold transition-colors" />
                          {getLinkLabel(link)}
                        </Link>
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
                    {sectorLinks.map((link) => (
                      <li key={link.key}>
                        <Link
                          href={link.href}
                          className="text-sm text-white/70 hover:text-gold hover:ps-2 transition-all duration-200 flex items-center gap-2 group"
                        >
                          <span className="w-1 h-1 bg-gold/30 group-hover:bg-gold transition-colors" />
                          {getLinkLabel(link)}
                        </Link>
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
                    {aboutLinks.map((link) => (
                      <li key={link.key}>
                        <Link
                          href={link.href}
                          className="text-sm text-white/70 hover:text-gold hover:ps-2 transition-all duration-200 flex items-center gap-2 group"
                        >
                          <span className="w-1 h-1 bg-gold/30 group-hover:bg-gold transition-colors" />
                          {getAboutName(link.key)}
                        </Link>
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
                <Link href="/privacy" className="hover:text-gold transition-colors">
                  {t('legal.privacy')}
                </Link>
                <span className="w-1 h-1 bg-gold/30 rounded-full" />
                <Link href="/terms" className="hover:text-gold transition-colors">
                  {t('legal.terms')}
                </Link>
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
            <Link href="/magazine" className="flex items-center gap-2 hover:text-gold transition-colors">
              <span className="w-1.5 h-1.5 bg-gold/30 rotate-45" />
              مجلة الاقتصاد والأعمال
            </Link>
            <a href="https://www.defaiya.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gold transition-colors">
              <span className="w-1.5 h-1.5 bg-gold/30 rotate-45" />
              مجلة الدفاعية
              <ExternalLink size={10} className="opacity-50" />
            </a>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold/30 rotate-45" />
              مجلة الحسناء
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
