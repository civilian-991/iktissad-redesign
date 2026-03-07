/**
 * Supabase module barrel export
 */

export { createClient } from "./client";
export { createClient as createServerClient } from "./server";
export { createAdminClient } from "./admin";
export type { Database } from "./types";
export type {
  SectionRow,
  SectionInsert,
  SectionUpdate,
  SectorRow,
  SectorInsert,
  SectorUpdate,
  CountryRow,
  CountryInsert,
  CountryUpdate,
  UserRow,
  UserInsert,
  UserUpdate,
  ArticleRow,
  ArticleInsert,
  ArticleUpdate,
  MagazineIssueRow,
  MagazineIssueInsert,
  MagazineIssueUpdate,
  MagazineArticleRow,
  MagazineArticleInsert,
  MagazineArticleUpdate,
  ProfileRow,
  ProfileInsert,
  ProfileUpdate,
  MediaRow,
  MediaInsert,
  MediaUpdate,
  NewsletterSubscriberRow,
  NewsletterSubscriberInsert,
  NewsletterSubscriberUpdate,
} from "./types";
