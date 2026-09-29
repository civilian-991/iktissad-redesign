'use client';

import { useTranslation } from '@/lib/i18n';
import type { Article } from '@/types';

/**
 * The paid-content marker the editorial policy requires on every sponsored
 * piece: "محتوى مدفوع" (client-written) or "محتوى شريك" (written by our team
 * for a client). Small pill for cards and listings.
 */
export function SponsoredPill({ sponsorship, className = '' }: {
  sponsorship: NonNullable<Article['sponsorship']>;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center rounded-sm bg-obsidian px-2 py-0.5 text-[11px] font-[family-name:var(--font-display)] font-bold tracking-wide text-gold ${className}`}
    >
      {sponsorship === 'partner' ? t('sponsored.labelPartner') : t('sponsored.labelSponsored')}
    </span>
  );
}

/**
 * Full disclosure block at the top of a sponsored article: the label, the
 * sponsor ("in partnership with" + logo) and a one-line explanation of what
 * the reader is looking at.
 */
export function SponsorDisclosure({ article }: { article: Article }) {
  const { t } = useTranslation();
  if (!article.sponsorship) return null;
  const sponsor = article.sponsor;

  const sponsorMark = sponsor ? (
    <span className="inline-flex items-center gap-2">
      {sponsor.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- advertiser logos are small, arbitrary-host assets
        <img src={sponsor.logoUrl} alt={sponsor.name} className="h-7 w-auto max-w-[140px] object-contain" />
      ) : (
        <span className="font-bold text-ink">{sponsor.name}</span>
      )}
    </span>
  ) : null;

  return (
    <div className="mb-5 border-y border-gold/30 bg-gold/[0.04] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SponsoredPill sponsorship={article.sponsorship} />
        {sponsor && (
          <span className="inline-flex items-center gap-2 text-[13px] font-[family-name:var(--font-display)] text-charcoal/60">
            {t('sponsored.inPartnershipWith')}
            {sponsor.websiteUrl ? (
              <a href={sponsor.websiteUrl} target="_blank" rel="sponsored noopener" className="hover:opacity-80">
                {sponsorMark}
              </a>
            ) : (
              sponsorMark
            )}
          </span>
        )}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed font-[family-name:var(--font-display)] text-charcoal/55">
        {article.sponsorship === 'partner' ? t('sponsored.disclosurePartner') : t('sponsored.disclosureSponsored')}
      </p>
    </div>
  );
}
