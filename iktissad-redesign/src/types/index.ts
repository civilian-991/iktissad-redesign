// =============================================================================
// IKTISSAD Shared Types
// =============================================================================
//
// These are the camelCase frontend types used by components and pages.
// For the snake_case database row types, see src/lib/supabase/types.ts.
// Mappers to convert between the two live in src/lib/supabase/mappers.ts.
// =============================================================================

export interface Article {
  id: string;
  title: string;
  titleEn: string;
  slug: string;
  excerpt: string;
  excerptEn: string;
  content: string;
  contentEn: string;
  featuredImage: string;
  section: string;
  sector: string;
  country: string;
  author: {
    name: string;
    avatar: string;
  };
  tags: string[];
  status: "published" | "draft" | "review" | "scheduled";
  views: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MagazineIssue {
  id: string;
  issueNumber: number;
  title: string;
  titleEn: string;
  subtitle: string;
  coverImage: string;
  publishDate: string;
  articles: Article[];
  pdfUrl: string;
  pages: number;
  views: number;
  downloads: number;
  featured: boolean;
  status: "published" | "draft" | "scheduled";
  highlights: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "author" | "contributor";
  avatar: string;
  department: string;
  status: "active" | "inactive" | "suspended";
  articleCount: number;
  lastActive: string;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  alt: string;
  altEn: string;
  folder: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  logo: string;
  sector: string;
  country: string;
  website: string;
  founded: string;
  type: string;
}

export interface Country {
  slug: string;
  name: string;
  nameEn: string;
  flag: string;
  economicOverview: string;
  economicOverviewEn: string;
  keyIndicators: Record<string, string | number>;
}

export interface Section {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  articleCount: number;
}

export interface Sector {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  articleCount: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
