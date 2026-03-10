/**
 * Spread Template Definitions
 * Template-based (NOT freeform) — editors pick a template, then fill content zones.
 * Each template defines a CSS Grid layout and a set of named zones.
 */

export type ZoneType =
  | "headline"
  | "body"
  | "image"
  | "pull-quote"
  | "sidebar"
  | "ad"
  | "byline"
  | "dataviz";

export interface SpreadZoneDefinition {
  id: string;
  type: ZoneType;
  label: string;
  labelAr: string;
  gridArea: string;
  /** Content types that can be dropped or assigned to this zone */
  allowedContent: string[];
}

export interface SpreadTemplateDefinition {
  id: string;
  name: string;
  nameAr: string;
  /** SVG string used as thumbnail preview (auto-generated at runtime, stored as empty placeholder) */
  thumbnail: string;
  zones: SpreadZoneDefinition[];
  /** CSS grid-template-areas value */
  gridTemplate: string;
  /** CSS grid-template-columns value */
  gridColumns: string;
  /** CSS grid-template-rows value */
  gridRows: string;
}

export const SPREAD_TEMPLATES: SpreadTemplateDefinition[] = [
  {
    id: "hero-left",
    name: "Hero Left",
    nameAr: "بطل يسار",
    thumbnail: "",
    // Grid: 2 columns — right col (40%): headline + body + byline, left col (60%): hero image
    // In RTL: right = start = text, left = end = image
    gridTemplate: '"headline image" "body image" "byline image"',
    gridColumns: "40% 60%",
    gridRows: "auto 1fr auto",
    zones: [
      {
        id: "headline",
        type: "headline",
        label: "Headline",
        labelAr: "العنوان",
        gridArea: "headline",
        allowedContent: ["text"],
      },
      {
        id: "body",
        type: "body",
        label: "Body Text",
        labelAr: "النص",
        gridArea: "body",
        allowedContent: ["text", "article"],
      },
      {
        id: "image",
        type: "image",
        label: "Hero Image",
        labelAr: "الصورة الرئيسية",
        gridArea: "image",
        allowedContent: ["image"],
      },
      {
        id: "byline",
        type: "byline",
        label: "Byline",
        labelAr: "خط المؤلف",
        gridArea: "byline",
        allowedContent: ["text"],
      },
    ],
  },

  {
    id: "hero-right",
    name: "Hero Right",
    nameAr: "بطل يمين",
    thumbnail: "",
    // Mirror of hero-left
    gridTemplate: '"image headline" "image body" "image byline"',
    gridColumns: "60% 40%",
    gridRows: "auto 1fr auto",
    zones: [
      {
        id: "headline",
        type: "headline",
        label: "Headline",
        labelAr: "العنوان",
        gridArea: "headline",
        allowedContent: ["text"],
      },
      {
        id: "body",
        type: "body",
        label: "Body Text",
        labelAr: "النص",
        gridArea: "body",
        allowedContent: ["text"],
      },
      {
        id: "image",
        type: "image",
        label: "Hero Image",
        labelAr: "الصورة",
        gridArea: "image",
        allowedContent: ["image"],
      },
      {
        id: "byline",
        type: "byline",
        label: "Byline",
        labelAr: "خط المؤلف",
        gridArea: "byline",
        allowedContent: ["text"],
      },
    ],
  },

  {
    id: "hero-full",
    name: "Hero Full Bleed",
    nameAr: "بطل كامل",
    thumbnail: "",
    // Full bleed image with text overlay
    gridTemplate: '"image" "headline" "body"',
    gridColumns: "1fr",
    gridRows: "1fr auto auto",
    zones: [
      {
        id: "image",
        type: "image",
        label: "Full Bleed Image",
        labelAr: "الصورة الكاملة",
        gridArea: "image",
        allowedContent: ["image"],
      },
      {
        id: "headline",
        type: "headline",
        label: "Headline",
        labelAr: "العنوان",
        gridArea: "headline",
        allowedContent: ["text"],
      },
      {
        id: "body",
        type: "body",
        label: "Introduction",
        labelAr: "المقدمة",
        gridArea: "body",
        allowedContent: ["text"],
      },
    ],
  },

  {
    id: "two-column",
    name: "Two Column",
    nameAr: "عمودان",
    thumbnail: "",
    gridTemplate: '"headline headline" "col1 col2" "byline byline"',
    gridColumns: "1fr 1fr",
    gridRows: "auto 1fr auto",
    zones: [
      {
        id: "headline",
        type: "headline",
        label: "Headline",
        labelAr: "العنوان",
        gridArea: "headline",
        allowedContent: ["text"],
      },
      {
        id: "col1",
        type: "body",
        label: "First Column",
        labelAr: "العمود الأول",
        gridArea: "col1",
        allowedContent: ["text", "image"],
      },
      {
        id: "col2",
        type: "body",
        label: "Second Column",
        labelAr: "العمود الثاني",
        gridArea: "col2",
        allowedContent: ["text", "image"],
      },
      {
        id: "byline",
        type: "byline",
        label: "Byline",
        labelAr: "خط المؤلف",
        gridArea: "byline",
        allowedContent: ["text"],
      },
    ],
  },

  {
    id: "text-heavy",
    name: "Text Heavy",
    nameAr: "نص مكثف",
    thumbnail: "",
    gridTemplate: '"headline sidebar" "body sidebar" "pull-quote sidebar"',
    gridColumns: "65% 35%",
    gridRows: "auto 1fr auto",
    zones: [
      {
        id: "headline",
        type: "headline",
        label: "Headline",
        labelAr: "العنوان",
        gridArea: "headline",
        allowedContent: ["text"],
      },
      {
        id: "body",
        type: "body",
        label: "Body Text",
        labelAr: "النص",
        gridArea: "body",
        allowedContent: ["text"],
      },
      {
        id: "pull-quote",
        type: "pull-quote",
        label: "Pull Quote",
        labelAr: "اقتباس بارز",
        gridArea: "pull-quote",
        allowedContent: ["text"],
      },
      {
        id: "sidebar",
        type: "sidebar",
        label: "Sidebar",
        labelAr: "الشريط الجانبي",
        gridArea: "sidebar",
        allowedContent: ["text", "image"],
      },
    ],
  },

  {
    id: "photo-essay",
    name: "Photo Essay",
    nameAr: "مقال مصور",
    thumbnail: "",
    gridTemplate: '"img1 img2 img3" "caption1 caption2 caption3"',
    gridColumns: "1fr 1fr 1fr",
    gridRows: "1fr auto",
    zones: [
      {
        id: "img1",
        type: "image",
        label: "Image 1",
        labelAr: "صورة ١",
        gridArea: "img1",
        allowedContent: ["image"],
      },
      {
        id: "img2",
        type: "image",
        label: "Image 2",
        labelAr: "صورة ٢",
        gridArea: "img2",
        allowedContent: ["image"],
      },
      {
        id: "img3",
        type: "image",
        label: "Image 3",
        labelAr: "صورة ٣",
        gridArea: "img3",
        allowedContent: ["image"],
      },
      {
        id: "caption1",
        type: "body",
        label: "Caption 1",
        labelAr: "تعليق ١",
        gridArea: "caption1",
        allowedContent: ["text"],
      },
      {
        id: "caption2",
        type: "body",
        label: "Caption 2",
        labelAr: "تعليق ٢",
        gridArea: "caption2",
        allowedContent: ["text"],
      },
      {
        id: "caption3",
        type: "body",
        label: "Caption 3",
        labelAr: "تعليق ٣",
        gridArea: "caption3",
        allowedContent: ["text"],
      },
    ],
  },

  {
    id: "opening-spread",
    name: "Opening Spread",
    nameAr: "افتتاحية العدد",
    thumbnail: "",
    gridTemplate: '"section-label section-label" "headline image" "deck image" "byline image"',
    gridColumns: "55% 45%",
    gridRows: "auto auto 1fr auto",
    zones: [
      {
        id: "section-label",
        type: "headline",
        label: "Section Label",
        labelAr: "اسم القسم",
        gridArea: "section-label",
        allowedContent: ["text"],
      },
      {
        id: "headline",
        type: "headline",
        label: "Main Headline",
        labelAr: "العنوان الكبير",
        gridArea: "headline",
        allowedContent: ["text"],
      },
      {
        id: "deck",
        type: "body",
        label: "Deck / Subheadline",
        labelAr: "العنوان الفرعي",
        gridArea: "deck",
        allowedContent: ["text"],
      },
      {
        id: "byline",
        type: "byline",
        label: "Author",
        labelAr: "الكاتب",
        gridArea: "byline",
        allowedContent: ["text"],
      },
      {
        id: "image",
        type: "image",
        label: "Image",
        labelAr: "الصورة",
        gridArea: "image",
        allowedContent: ["image"],
      },
    ],
  },

  {
    id: "interview",
    name: "Interview",
    nameAr: "مقابلة",
    thumbnail: "",
    gridTemplate: '"portrait headline" "portrait body" "caption pull-quote"',
    gridColumns: "40% 60%",
    gridRows: "auto 1fr auto",
    zones: [
      {
        id: "portrait",
        type: "image",
        label: "Portrait",
        labelAr: "صورة الشخصية",
        gridArea: "portrait",
        allowedContent: ["image"],
      },
      {
        id: "headline",
        type: "headline",
        label: "Headline",
        labelAr: "العنوان",
        gridArea: "headline",
        allowedContent: ["text"],
      },
      {
        id: "body",
        type: "body",
        label: "Interview Text",
        labelAr: "نص المقابلة",
        gridArea: "body",
        allowedContent: ["text"],
      },
      {
        id: "caption",
        type: "body",
        label: "Bio / Caption",
        labelAr: "نبذة عن الشخصية",
        gridArea: "caption",
        allowedContent: ["text"],
      },
      {
        id: "pull-quote",
        type: "pull-quote",
        label: "Pull Quote",
        labelAr: "اقتباس",
        gridArea: "pull-quote",
        allowedContent: ["text"],
      },
    ],
  },

  {
    id: "infographic",
    name: "Infographic",
    nameAr: "إنفوجرافيك",
    thumbnail: "",
    gridTemplate: '"headline headline" "dataviz dataviz" "source source"',
    gridColumns: "1fr 1fr",
    gridRows: "auto 1fr auto",
    zones: [
      {
        id: "headline",
        type: "headline",
        label: "Headline",
        labelAr: "العنوان",
        gridArea: "headline",
        allowedContent: ["text"],
      },
      {
        id: "dataviz",
        type: "dataviz",
        label: "Data Visualization",
        labelAr: "البيانات المرئية",
        gridArea: "dataviz",
        allowedContent: ["image", "chart"],
      },
      {
        id: "source",
        type: "body",
        label: "Source",
        labelAr: "المصدر",
        gridArea: "source",
        allowedContent: ["text"],
      },
    ],
  },

  {
    id: "ad-full",
    name: "Full Page Ad",
    nameAr: "إعلان كامل",
    thumbnail: "",
    gridTemplate: '"ad"',
    gridColumns: "1fr",
    gridRows: "1fr",
    zones: [
      {
        id: "ad",
        type: "ad",
        label: "Advertisement",
        labelAr: "الإعلان",
        gridArea: "ad",
        allowedContent: ["image", "ad"],
      },
    ],
  },
];

/** Map from template ID to definition for O(1) lookup */
export const SPREAD_TEMPLATE_MAP = new Map<string, SpreadTemplateDefinition>(
  SPREAD_TEMPLATES.map((t) => [t.id, t])
);

/** Zone type colors for SVG thumbnail generation */
export const ZONE_TYPE_COLORS: Record<ZoneType, string> = {
  headline: "#27548A",
  body: "#183B4E",
  image: "#DDA853",
  "pull-quote": "#8B6914",
  sidebar: "#2A4A5E",
  ad: "#6B4C9A",
  byline: "#1E3A48",
  dataviz: "#B8860B",
};
