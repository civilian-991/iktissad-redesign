/**
 * Supabase Database Types
 *
 * Auto-generated style types matching supabase/schema.sql.
 * Keep in sync when the schema changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      sections: {
        Row: {
          id: string;
          slug: string;
          name: string;
          name_en: string;
          description: string;
          description_en: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          name_en?: string;
          description?: string;
          description_en?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          name_en?: string;
          description?: string;
          description_en?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sectors: {
        Row: {
          id: string;
          slug: string;
          name: string;
          name_en: string;
          description: string;
          description_en: string;
          icon: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          name_en?: string;
          description?: string;
          description_en?: string;
          icon?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          name_en?: string;
          description?: string;
          description_en?: string;
          icon?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      countries: {
        Row: {
          id: string;
          slug: string;
          name: string;
          name_en: string;
          flag: string;
          economic_overview: string;
          economic_overview_en: string;
          key_indicators: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          name_en?: string;
          flag?: string;
          economic_overview?: string;
          economic_overview_en?: string;
          key_indicators?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          name_en?: string;
          flag?: string;
          economic_overview?: string;
          economic_overview_en?: string;
          key_indicators?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: "admin" | "editor" | "author" | "contributor";
          avatar: string;
          department: string;
          status: "active" | "inactive" | "suspended";
          article_count: number;
          last_active: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role?: "admin" | "editor" | "author" | "contributor";
          avatar?: string;
          department?: string;
          status?: "active" | "inactive" | "suspended";
          article_count?: number;
          last_active?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: "admin" | "editor" | "author" | "contributor";
          avatar?: string;
          department?: string;
          status?: "active" | "inactive" | "suspended";
          article_count?: number;
          last_active?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          slug: string;
          title: string;
          title_en: string;
          excerpt: string;
          excerpt_en: string;
          content: string;
          content_en: string;
          featured_image: string;
          section_id: string | null;
          sector_id: string | null;
          country_id: string | null;
          author_id: string | null;
          tags: string[];
          status: "published" | "draft" | "review" | "scheduled";
          views: number;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          title_en?: string;
          excerpt?: string;
          excerpt_en?: string;
          content?: string;
          content_en?: string;
          featured_image?: string;
          section_id?: string | null;
          sector_id?: string | null;
          country_id?: string | null;
          author_id?: string | null;
          tags?: string[];
          status?: "published" | "draft" | "review" | "scheduled";
          views?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          title_en?: string;
          excerpt?: string;
          excerpt_en?: string;
          content?: string;
          content_en?: string;
          featured_image?: string;
          section_id?: string | null;
          sector_id?: string | null;
          country_id?: string | null;
          author_id?: string | null;
          tags?: string[];
          status?: "published" | "draft" | "review" | "scheduled";
          views?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "articles_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_country_id_fkey";
            columns: ["country_id"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      magazine_issues: {
        Row: {
          id: string;
          issue_number: number;
          title: string;
          title_en: string;
          subtitle: string;
          cover_image: string;
          publish_date: string;
          pdf_url: string;
          pages: number;
          views: number;
          downloads: number;
          featured: boolean;
          status: "published" | "draft" | "scheduled";
          highlights: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          issue_number: number;
          title: string;
          title_en?: string;
          subtitle?: string;
          cover_image?: string;
          publish_date: string;
          pdf_url?: string;
          pages?: number;
          views?: number;
          downloads?: number;
          featured?: boolean;
          status?: "published" | "draft" | "scheduled";
          highlights?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          issue_number?: number;
          title?: string;
          title_en?: string;
          subtitle?: string;
          cover_image?: string;
          publish_date?: string;
          pdf_url?: string;
          pages?: number;
          views?: number;
          downloads?: number;
          featured?: boolean;
          status?: "published" | "draft" | "scheduled";
          highlights?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      magazine_articles: {
        Row: {
          magazine_id: string;
          article_id: string;
          sort_order: number;
        };
        Insert: {
          magazine_id: string;
          article_id: string;
          sort_order?: number;
        };
        Update: {
          magazine_id?: string;
          article_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "magazine_articles_magazine_id_fkey";
            columns: ["magazine_id"];
            isOneToOne: false;
            referencedRelation: "magazine_issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "magazine_articles_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          name_en: string;
          description: string;
          description_en: string;
          logo: string;
          sector_id: string | null;
          country_id: string | null;
          website: string;
          founded: string;
          type: "corporation" | "government" | "ngo" | "individual";
          quote: string;
          image: string;
          category: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_en?: string;
          description?: string;
          description_en?: string;
          logo?: string;
          sector_id?: string | null;
          country_id?: string | null;
          website?: string;
          founded?: string;
          type?: "corporation" | "government" | "ngo" | "individual";
          quote?: string;
          image?: string;
          category?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_en?: string;
          description?: string;
          description_en?: string;
          logo?: string;
          sector_id?: string | null;
          country_id?: string | null;
          website?: string;
          founded?: string;
          type?: "corporation" | "government" | "ngo" | "individual";
          quote?: string;
          image?: string;
          category?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_country_id_fkey";
            columns: ["country_id"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["id"];
          },
        ];
      };
      media: {
        Row: {
          id: string;
          url: string;
          filename: string;
          mime_type: string;
          size: number;
          alt: string;
          alt_en: string;
          folder: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          filename: string;
          mime_type?: string;
          size?: number;
          alt?: string;
          alt_en?: string;
          folder?: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          filename?: string;
          mime_type?: string;
          size?: number;
          alt?: string;
          alt_en?: string;
          folder?: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          status: "active" | "unsubscribed";
          subscribed_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          status?: "active" | "unsubscribed";
          subscribed_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          status?: "active" | "unsubscribed";
          subscribed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      article_status: "published" | "draft" | "review" | "scheduled";
      user_role: "admin" | "editor" | "author" | "contributor";
      user_status: "active" | "inactive" | "suspended";
      profile_type: "corporation" | "government" | "ngo" | "individual";
      magazine_status: "published" | "draft" | "scheduled";
      subscriber_status: "active" | "unsubscribed";
    };
  };
};

// ──────────────────────────────────────────────────────────────
// Convenience aliases for each table's Row / Insert / Update
// ──────────────────────────────────────────────────────────────

type Tables = Database["public"]["Tables"];

export type SectionRow    = Tables["sections"]["Row"];
export type SectionInsert = Tables["sections"]["Insert"];
export type SectionUpdate = Tables["sections"]["Update"];

export type SectorRow    = Tables["sectors"]["Row"];
export type SectorInsert = Tables["sectors"]["Insert"];
export type SectorUpdate = Tables["sectors"]["Update"];

export type CountryRow    = Tables["countries"]["Row"];
export type CountryInsert = Tables["countries"]["Insert"];
export type CountryUpdate = Tables["countries"]["Update"];

export type UserRow    = Tables["users"]["Row"];
export type UserInsert = Tables["users"]["Insert"];
export type UserUpdate = Tables["users"]["Update"];

export type ArticleRow    = Tables["articles"]["Row"];
export type ArticleInsert = Tables["articles"]["Insert"];
export type ArticleUpdate = Tables["articles"]["Update"];

export type MagazineIssueRow    = Tables["magazine_issues"]["Row"];
export type MagazineIssueInsert = Tables["magazine_issues"]["Insert"];
export type MagazineIssueUpdate = Tables["magazine_issues"]["Update"];

export type MagazineArticleRow    = Tables["magazine_articles"]["Row"];
export type MagazineArticleInsert = Tables["magazine_articles"]["Insert"];
export type MagazineArticleUpdate = Tables["magazine_articles"]["Update"];

export type ProfileRow    = Tables["profiles"]["Row"];
export type ProfileInsert = Tables["profiles"]["Insert"];
export type ProfileUpdate = Tables["profiles"]["Update"];

export type MediaRow    = Tables["media"]["Row"];
export type MediaInsert = Tables["media"]["Insert"];
export type MediaUpdate = Tables["media"]["Update"];

export type NewsletterSubscriberRow    = Tables["newsletter_subscribers"]["Row"];
export type NewsletterSubscriberInsert = Tables["newsletter_subscribers"]["Insert"];
export type NewsletterSubscriberUpdate = Tables["newsletter_subscribers"]["Update"];
