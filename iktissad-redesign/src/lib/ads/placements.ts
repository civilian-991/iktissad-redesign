/**
 * The web display products on the 2026 rate card, and the page slots they
 * run in. Client-safe: shared by the admin forms, the serving endpoint and
 * the <AdSlot> component.
 *
 * A *placement* is what an advertiser buys (e.g. "In-Article MPU").
 * A *slot* is a position on a page. Most slots show one placement; slots that
 * also take Run-of-Site creatives list the sizes they accept, because ROS
 * creatives come in several sizes.
 */

export type AdPlacement =
  | 'homepage_billboard'
  | 'article_leaderboard'
  | 'in_article_mpu'
  | 'sticky_mobile'
  | 'run_of_site';

export type AdSize = '970x250' | '728x90' | '300x250' | '300x600' | '320x50' | '320x100';

export interface PlacementSpec {
  label: string;
  labelEn: string;
  /** Desktop creative sizes; empty = not shown on desktop. */
  desktopSizes: AdSize[];
  /** Mobile creative sizes; empty = not shown on mobile. */
  mobileSizes: AdSize[];
  maxKb: number;
  /** Rate-card price, for the admin form hint. */
  rateHint: string;
}

export const PLACEMENTS: Record<AdPlacement, PlacementSpec> = {
  homepage_billboard: {
    label: 'بيلبورد الصفحة الرئيسية',
    labelEn: 'Homepage Billboard',
    desktopSizes: ['970x250'],
    mobileSizes: ['320x100'],
    maxKb: 150,
    rateHint: '$4,500 / شهر — معلن واحد حصرياً',
  },
  article_leaderboard: {
    label: 'ليدربورد أعلى المقال',
    labelEn: 'Article Top Leaderboard',
    desktopSizes: ['728x90'],
    mobileSizes: ['320x50'],
    maxKb: 150,
    rateHint: '$30 CPM',
  },
  in_article_mpu: {
    label: 'مستطيل داخل المقال',
    labelEn: 'In-Article MPU',
    desktopSizes: ['300x250'],
    mobileSizes: ['300x250'],
    maxKb: 150,
    rateHint: '$25 CPM',
  },
  sticky_mobile: {
    label: 'بانر الجوال الثابت',
    labelEn: 'Sticky Mobile Banner',
    desktopSizes: [],
    mobileSizes: ['320x50'],
    maxKb: 100,
    rateHint: '$20 CPM',
  },
  run_of_site: {
    label: 'عبر الموقع (Run-of-Site)',
    labelEn: 'Run-of-Site',
    desktopSizes: ['300x250', '300x600', '728x90'],
    mobileSizes: ['300x250', '320x50'],
    maxKb: 150,
    rateHint: '$15 CPM',
  },
};

export const PLACEMENT_KEYS = Object.keys(PLACEMENTS) as AdPlacement[];

export type AdSlotName =
  | 'homepage_billboard'
  | 'homepage_mid'
  | 'article_leaderboard'
  | 'in_article_mpu'
  | 'article_sidebar'
  | 'section_inline'
  | 'sticky_mobile';

export interface SlotSpec {
  /** The placement sold for this slot, if any. */
  placement: AdPlacement | null;
  /** Run-of-Site creative sizes this slot accepts as a fallback. */
  rosSizes: AdSize[];
}

export const SLOTS: Record<AdSlotName, SlotSpec> = {
  homepage_billboard: { placement: 'homepage_billboard', rosSizes: [] },
  homepage_mid:       { placement: null, rosSizes: ['728x90'] },
  article_leaderboard:{ placement: 'article_leaderboard', rosSizes: ['728x90'] },
  in_article_mpu:     { placement: 'in_article_mpu', rosSizes: ['300x250'] },
  article_sidebar:    { placement: null, rosSizes: ['300x600', '300x250'] },
  section_inline:     { placement: null, rosSizes: ['728x90', '300x250'] },
  sticky_mobile:      { placement: 'sticky_mobile', rosSizes: ['320x50'] },
};

export const SLOT_NAMES = Object.keys(SLOTS) as AdSlotName[];

/**
 * Google Ad Manager backfill: which ad unit each slot requests when no direct
 * booking fills it. These are the legacy iktissadonline.com units (network
 * 21805397792), so orders already trafficked against them keep delivering on
 * the new site. Desktop applies from 768px up, mobile below. The billboard
 * adds 970×250 to HP-LLDR's legacy 970×90 / 728×90 sizes.
 */
export interface GamUnit {
  unit: string;
  sizes: [number, number][];
}

export const GAM_UNITS: Record<AdSlotName, { desktop: GamUnit | null; mobile: GamUnit | null }> = {
  homepage_billboard:  { desktop: { unit: 'HP-LLDR', sizes: [[970, 250], [970, 90], [728, 90]] }, mobile: { unit: 'MB-LDR', sizes: [[320, 50]] } },
  homepage_mid:        { desktop: { unit: 'LDB2', sizes: [[728, 90]] }, mobile: { unit: 'HP-MPU', sizes: [[300, 250]] } },
  article_leaderboard: { desktop: { unit: 'LD2', sizes: [[728, 90]] }, mobile: { unit: 'MB-LDR', sizes: [[320, 50]] } },
  in_article_mpu:      { desktop: { unit: 'HP-MPU', sizes: [[300, 250]] }, mobile: { unit: 'HP-MPU', sizes: [[300, 250]] } },
  article_sidebar:     { desktop: { unit: 'MPU2-HFP', sizes: [[300, 600], [300, 250]] }, mobile: { unit: 'MPU2-HFP', sizes: [[300, 250]] } },
  section_inline:      { desktop: { unit: 'LDB2', sizes: [[728, 90]] }, mobile: { unit: 'HP-MPU', sizes: [[300, 250]] } },
  sticky_mobile:       { desktop: null, mobile: { unit: 'MB-LDR', sizes: [[320, 50]] } },
};

export function parseSize(size: string | null | undefined): { width: number; height: number } | null {
  const m = size?.match(/^(\d+)x(\d+)$/);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

/** The creative a slot renders — shape returned by GET /api/ads/serve. */
export interface ServedAd {
  id: string;
  placement: AdPlacement;
  format: 'image' | 'html5';
  src: string;
  mobileSrc: string | null;
  width: number;
  height: number;
  mobileWidth: number | null;
  mobileHeight: number | null;
  alt: string;
  clickUrl: string | null;
}
