/**
 * Supabase Row <-> Frontend Type Mappers
 *
 * Converts between snake_case DB rows and camelCase frontend types.
 * Used by API routes when reading from / writing to the database.
 */

import type {
  ArticleRow,
  MagazineIssueRow,
  UserRow,
  MediaRow,
  ProfileRow,
  CountryRow,
  SectionRow,
  SectorRow,
} from "./types";
import type {
  Article,
  MagazineIssue,
  AdminUser,
  MediaItem,
  Profile,
  Country,
  Section,
  Sector,
} from "@/types";

// ──────────────────────────────────────────────────────────────
// Articles
// ──────────────────────────────────────────────────────────────

/** article row + joined author -> frontend Article */
export function mapArticleRow(
  row: ArticleRow & {
    users?: { name: string; avatar: string } | null;
    sections?: { slug: string } | null;
    sectors?: { slug: string } | null;
    countries?: { slug: string } | null;
  }
): Article {
  return {
    id: row.id,
    title: row.title,
    titleEn: row.title_en,
    slug: row.slug,
    excerpt: row.excerpt,
    excerptEn: row.excerpt_en,
    content: row.content,
    contentEn: row.content_en,
    featuredImage: row.featured_image,
    section: row.sections?.slug ?? "",
    sector: row.sectors?.slug ?? "",
    country: row.countries?.slug ?? "",
    author: {
      name: row.users?.name ?? "",
      avatar: row.users?.avatar ?? "",
    },
    tags: row.tags,
    status: row.status,
    views: row.views,
    publishedAt: row.published_at ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Magazine Issues
// ──────────────────────────────────────────────────────────────

export function mapMagazineIssueRow(
  row: MagazineIssueRow,
  articles: Article[] = []
): MagazineIssue {
  return {
    id: row.id,
    issueNumber: row.issue_number,
    title: row.title,
    titleEn: row.title_en,
    subtitle: row.subtitle,
    coverImage: row.cover_image,
    publishDate: row.publish_date,
    articles,
    pdfUrl: row.pdf_url,
    pages: row.pages,
    views: row.views,
    downloads: row.downloads,
    featured: row.featured,
    status: row.status,
    highlights: row.highlights,
  };
}

// ──────────────────────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────────────────────

export function mapUserRow(row: UserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    department: row.department,
    status: row.status,
    articleCount: row.article_count,
    lastActive: row.last_active,
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Media
// ──────────────────────────────────────────────────────────────

export function mapMediaRow(row: MediaRow): MediaItem {
  return {
    id: row.id,
    url: row.url,
    filename: row.filename,
    mimeType: row.mime_type,
    size: row.size,
    alt: row.alt,
    altEn: row.alt_en,
    folder: row.folder,
    uploadedBy: row.uploaded_by ?? "",
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Profiles
// ──────────────────────────────────────────────────────────────

export function mapProfileRow(
  row: ProfileRow & {
    sectors?: { slug: string } | null;
    countries?: { slug: string } | null;
  }
): Profile {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    description: row.description,
    descriptionEn: row.description_en,
    logo: row.logo,
    sector: row.sectors?.slug ?? "",
    country: row.countries?.slug ?? "",
    website: row.website,
    founded: row.founded,
    type: row.type,
  };
}

// ──────────────────────────────────────────────────────────────
// Countries
// ──────────────────────────────────────────────────────────────

export function mapCountryRow(row: CountryRow): Country {
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    flag: row.flag,
    economicOverview: row.economic_overview,
    economicOverviewEn: row.economic_overview_en,
    keyIndicators: row.key_indicators as Record<string, string | number>,
  };
}

// ──────────────────────────────────────────────────────────────
// Sections
// ──────────────────────────────────────────────────────────────

export function mapSectionRow(
  row: SectionRow,
  articleCount: number = 0
): Section {
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    description: row.description,
    descriptionEn: row.description_en,
    articleCount,
  };
}

// ──────────────────────────────────────────────────────────────
// Sectors
// ──────────────────────────────────────────────────────────────

export function mapSectorRow(
  row: SectorRow,
  articleCount: number = 0
): Sector {
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    description: row.description,
    descriptionEn: row.description_en,
    articleCount,
  };
}
