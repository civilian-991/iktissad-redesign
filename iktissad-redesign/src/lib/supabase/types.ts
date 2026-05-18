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
          region: string;
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
          region?: string;
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
          region?: string;
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
          featured: boolean;
          editor_choice: boolean;
          views: number;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          body: Json | null;
          deck: string | null;
          deck_en: string | null;
          accent_color: string | null;
          featured_image_focal_x: number;
          featured_image_focal_y: number;
          article_type: string | null;
          is_breaking: boolean;
          is_paywalled: boolean;
          is_paid: boolean;
          video_url: string | null;
          meta_title: string | null;
          meta_description: string | null;
          og_image: string | null;
          canonical_url: string | null;
          no_index: boolean;
          source_site: string | null;
          source_id: number | null;
          legacy_url: string | null;
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
          featured?: boolean;
          editor_choice?: boolean;
          views?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          body?: Json | null;
          deck?: string | null;
          deck_en?: string | null;
          accent_color?: string | null;
          featured_image_focal_x?: number;
          featured_image_focal_y?: number;
          article_type?: string | null;
          is_breaking?: boolean;
          is_paywalled?: boolean;
          is_paid?: boolean;
          video_url?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          og_image?: string | null;
          canonical_url?: string | null;
          no_index?: boolean;
          source_site?: string | null;
          source_id?: number | null;
          legacy_url?: string | null;
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
          featured?: boolean;
          editor_choice?: boolean;
          views?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          body?: Json | null;
          deck?: string | null;
          deck_en?: string | null;
          accent_color?: string | null;
          featured_image_focal_x?: number;
          featured_image_focal_y?: number;
          article_type?: string | null;
          is_breaking?: boolean;
          is_paywalled?: boolean;
          is_paid?: boolean;
          video_url?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          og_image?: string | null;
          canonical_url?: string | null;
          no_index?: boolean;
          source_site?: string | null;
          source_id?: number | null;
          legacy_url?: string | null;
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
      // ── Phase 10.1: Article Series (Dossiers) ────────────────────
      article_series: {
        Row: {
          id: string;
          slug: string;
          title: string;
          title_en: string;
          description: string;
          description_en: string;
          cover_image: string;
          status: "active" | "archived";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          title_en?: string;
          description?: string;
          description_en?: string;
          cover_image?: string;
          status?: "active" | "archived";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          title_en?: string;
          description?: string;
          description_en?: string;
          cover_image?: string;
          status?: "active" | "archived";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      series_articles: {
        Row: {
          id: string;
          series_id: string;
          article_id: string;
          order_index: number;
          added_at: string;
        };
        Insert: {
          id?: string;
          series_id: string;
          article_id: string;
          order_index?: number;
          added_at?: string;
        };
        Update: {
          id?: string;
          series_id?: string;
          article_id?: string;
          order_index?: number;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "series_articles_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "article_series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "series_articles_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      // ── Phase 1A: Content Model ──────────────────────────────────
      magazine_sections: {
        Row: {
          id: string;
          issue_id: string | null;
          slug: string;
          name: string;
          name_en: string;
          sort_order: number;
          theme_color: string;
          cover_image: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          issue_id?: string | null;
          slug: string;
          name: string;
          name_en?: string;
          sort_order?: number;
          theme_color?: string;
          cover_image?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          issue_id?: string | null;
          slug?: string;
          name?: string;
          name_en?: string;
          sort_order?: number;
          theme_color?: string;
          cover_image?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "magazine_sections_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "magazine_issues";
            referencedColumns: ["id"];
          },
        ];
      };
      spread_templates: {
        Row: {
          id: string;
          slug: string;
          name: string;
          name_ar: string;
          thumbnail_svg: string | null;
          zones: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          name_ar: string;
          thumbnail_svg?: string | null;
          zones?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          name_ar?: string;
          thumbnail_svg?: string | null;
          zones?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      magazine_spreads: {
        Row: {
          id: string;
          issue_id: string | null;
          section_id: string | null;
          page_number: number;
          template_id: string;
          zones: Json;
          metadata: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          issue_id?: string | null;
          section_id?: string | null;
          page_number: number;
          template_id: string;
          zones?: Json;
          metadata?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          issue_id?: string | null;
          section_id?: string | null;
          page_number?: number;
          template_id?: string;
          zones?: Json;
          metadata?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "magazine_spreads_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "magazine_issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "magazine_spreads_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "magazine_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "magazine_spreads_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      spread_revisions: {
        Row: {
          id: string;
          spread_id: string | null;
          snapshot: Json;
          saved_at: string;
          saved_by: string | null;
          label: string | null;
        };
        Insert: {
          id?: string;
          spread_id?: string | null;
          snapshot: Json;
          saved_at?: string;
          saved_by?: string | null;
          label?: string | null;
        };
        Update: {
          id?: string;
          spread_id?: string | null;
          snapshot?: Json;
          saved_at?: string;
          saved_by?: string | null;
          label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "spread_revisions_spread_id_fkey";
            columns: ["spread_id"];
            isOneToOne: false;
            referencedRelation: "magazine_spreads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "spread_revisions_saved_by_fkey";
            columns: ["saved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      // ── Phase 1A: Subscriptions ──────────────────────────────────
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          name_ar: string;
          description: string | null;
          description_ar: string | null;
          price_monthly: number;
          price_annual: number | null;
          interval: "monthly" | "annual" | "quarterly";
          features: Json;
          features_ar: Json;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_ar: string;
          description?: string | null;
          description_ar?: string | null;
          price_monthly: number;
          price_annual?: number | null;
          interval?: "monthly" | "annual" | "quarterly";
          features?: Json;
          features_ar?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_ar?: string;
          description?: string | null;
          description_ar?: string | null;
          price_monthly?: number;
          price_annual?: number | null;
          interval?: "monthly" | "annual" | "quarterly";
          features?: Json;
          features_ar?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      promo_codes: {
        Row: {
          id: string;
          code: string;
          discount_type: "percent" | "fixed";
          discount_value: number;
          max_uses: number | null;
          uses_count: number;
          valid_from: string;
          valid_until: string | null;
          plans: string[] | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type: "percent" | "fixed";
          discount_value: number;
          max_uses?: number | null;
          uses_count?: number;
          valid_from?: string;
          valid_until?: string | null;
          plans?: string[] | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: "percent" | "fixed";
          discount_value?: number;
          max_uses?: number | null;
          uses_count?: number;
          valid_from?: string;
          valid_until?: string | null;
          plans?: string[] | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      subscribers: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          name: string | null;
          phone: string | null;
          country_code: string | null;
          plan_id: string | null;
          status: "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete";
          trial_ends_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          canceled_at: string | null;
          payment_method: Json | null;
          gateway_customer_id: string | null;
          gateway_subscription_id: string | null;
          promo_code_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          name?: string | null;
          phone?: string | null;
          country_code?: string | null;
          plan_id?: string | null;
          status?: "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete";
          trial_ends_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          canceled_at?: string | null;
          payment_method?: Json | null;
          gateway_customer_id?: string | null;
          gateway_subscription_id?: string | null;
          promo_code_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string;
          name?: string | null;
          phone?: string | null;
          country_code?: string | null;
          plan_id?: string | null;
          status?: "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete";
          trial_ends_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          canceled_at?: string | null;
          payment_method?: Json | null;
          gateway_customer_id?: string | null;
          gateway_subscription_id?: string | null;
          promo_code_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscribers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscribers_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscribers_promo_code_id_fkey";
            columns: ["promo_code_id"];
            isOneToOne: false;
            referencedRelation: "promo_codes";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          subscriber_id: string;
          plan_id: string | null;
          amount: number;
          currency: string;
          status: string;
          gateway_payment_id: string | null;
          description: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscriber_id: string;
          plan_id?: string | null;
          amount: number;
          currency?: string;
          status: string;
          gateway_payment_id?: string | null;
          description?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscriber_id?: string;
          plan_id?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          gateway_payment_id?: string | null;
          description?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_subscriber_id_fkey";
            columns: ["subscriber_id"];
            isOneToOne: false;
            referencedRelation: "subscribers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      // ── Phase 1A: Analytics ──────────────────────────────────────
      article_reads: {
        Row: {
          id: string;
          article_id: string;
          subscriber_id: string | null;
          session_id: string;
          time_on_page: number;
          scroll_depth: number;
          read_through: boolean;
          referrer: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          subscriber_id?: string | null;
          session_id: string;
          time_on_page?: number;
          scroll_depth?: number;
          read_through?: boolean;
          referrer?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          subscriber_id?: string | null;
          session_id?: string;
          time_on_page?: number;
          scroll_depth?: number;
          read_through?: boolean;
          referrer?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "article_reads_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "article_reads_subscriber_id_fkey";
            columns: ["subscriber_id"];
            isOneToOne: false;
            referencedRelation: "subscribers";
            referencedColumns: ["id"];
          },
        ];
      };
      magazine_spread_reads: {
        Row: {
          id: string;
          issue_id: string;
          subscriber_id: string | null;
          session_id: string;
          spread_number: number;
          dwell_seconds: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          issue_id: string;
          subscriber_id?: string | null;
          session_id: string;
          spread_number: number;
          dwell_seconds?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          issue_id?: string;
          subscriber_id?: string | null;
          session_id?: string;
          spread_number?: number;
          dwell_seconds?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "magazine_spread_reads_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "magazine_issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "magazine_spread_reads_subscriber_id_fkey";
            columns: ["subscriber_id"];
            isOneToOne: false;
            referencedRelation: "subscribers";
            referencedColumns: ["id"];
          },
        ];
      };
      // ── Phase 1A: Admin ──────────────────────────────────────────
      admin_roles: {
        Row: {
          user_id: string;
          role: "super_admin" | "editor" | "writer" | "finance" | "advertiser_manager";
          permissions: Json;
          invited_by: string | null;
          two_fa_enabled: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          role?: "super_admin" | "editor" | "writer" | "finance" | "advertiser_manager";
          permissions?: Json;
          invited_by?: string | null;
          two_fa_enabled?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          role?: "super_admin" | "editor" | "writer" | "finance" | "advertiser_manager";
          permissions?: Json;
          invited_by?: string | null;
          two_fa_enabled?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_roles_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_notifications: {
        Row: {
          id: string;
          type: "new_subscriber" | "payment_failed" | "subscription_canceled" | "comment_flagged" | "article_published" | "manual_change";
          title: string;
          body: string | null;
          resource_id: string | null;
          is_read: boolean;
          read_by: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          type: "new_subscriber" | "payment_failed" | "subscription_canceled" | "comment_flagged" | "article_published" | "manual_change";
          title: string;
          body?: string | null;
          resource_id?: string | null;
          is_read?: boolean;
          read_by?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: "new_subscriber" | "payment_failed" | "subscription_canceled" | "comment_flagged" | "article_published" | "manual_change";
          title?: string;
          body?: string | null;
          resource_id?: string | null;
          is_read?: boolean;
          read_by?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      // ── Phase 1A: Editorial ──────────────────────────────────────
      article_assignments: {
        Row: {
          id: string;
          article_id: string | null;
          assignee_id: string | null;
          role: "writer" | "editor" | "photographer" | "designer" | null;
          due_date: string | null;
          note: string | null;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          article_id?: string | null;
          assignee_id?: string | null;
          role?: "writer" | "editor" | "photographer" | "designer" | null;
          due_date?: string | null;
          note?: string | null;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          article_id?: string | null;
          assignee_id?: string | null;
          role?: "writer" | "editor" | "photographer" | "designer" | null;
          due_date?: string | null;
          note?: string | null;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "article_assignments_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "article_assignments_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "article_assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      article_status_history: {
        Row: {
          id: string;
          article_id: string | null;
          old_status: string | null;
          new_status: string;
          changed_by: string | null;
          note: string | null;
          changed_at: string;
        };
        Insert: {
          id?: string;
          article_id?: string | null;
          old_status?: string | null;
          new_status: string;
          changed_by?: string | null;
          note?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string | null;
          old_status?: string | null;
          new_status?: string;
          changed_by?: string | null;
          note?: string | null;
          changed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "article_status_history_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "article_status_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          article_id: string | null;
          user_id: string | null;
          parent_id: string | null;
          body: string;
          status: "pending" | "approved" | "rejected" | "spam";
          moderated_by: string | null;
          moderated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id?: string | null;
          user_id?: string | null;
          parent_id?: string | null;
          body: string;
          status?: "pending" | "approved" | "rejected" | "spam";
          moderated_by?: string | null;
          moderated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string | null;
          user_id?: string | null;
          parent_id?: string | null;
          body?: string;
          status?: "pending" | "approved" | "rejected" | "spam";
          moderated_by?: string | null;
          moderated_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_moderated_by_fkey";
            columns: ["moderated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      // ── Phase 1A: Ads ────────────────────────────────────────────
      advertisers: {
        Row: {
          id: string;
          name: string;
          name_en: string | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_en?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_en?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ad_campaigns: {
        Row: {
          id: string;
          advertiser_id: string | null;
          name: string;
          start_date: string | null;
          end_date: string | null;
          budget_cents: number | null;
          status: "draft" | "active" | "paused" | "completed";
        };
        Insert: {
          id?: string;
          advertiser_id?: string | null;
          name: string;
          start_date?: string | null;
          end_date?: string | null;
          budget_cents?: number | null;
          status?: "draft" | "active" | "paused" | "completed";
        };
        Update: {
          id?: string;
          advertiser_id?: string | null;
          name?: string;
          start_date?: string | null;
          end_date?: string | null;
          budget_cents?: number | null;
          status?: "draft" | "active" | "paused" | "completed";
        };
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_advertiser_id_fkey";
            columns: ["advertiser_id"];
            isOneToOne: false;
            referencedRelation: "advertisers";
            referencedColumns: ["id"];
          },
        ];
      };
      ads: {
        Row: {
          id: string;
          campaign_id: string | null;
          type: "full-page" | "half-page" | "banner" | "sponsor-card" | null;
          image_url: string;
          target_url: string | null;
          alt_text: string | null;
          impressions: number;
          clicks: number;
          issue_id: string | null;
          spread_number: number | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          type?: "full-page" | "half-page" | "banner" | "sponsor-card" | null;
          image_url: string;
          target_url?: string | null;
          alt_text?: string | null;
          impressions?: number;
          clicks?: number;
          issue_id?: string | null;
          spread_number?: number | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          type?: "full-page" | "half-page" | "banner" | "sponsor-card" | null;
          image_url?: string;
          target_url?: string | null;
          alt_text?: string | null;
          impressions?: number;
          clicks?: number;
          issue_id?: string | null;
          spread_number?: number | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ads_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "ad_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ads_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "magazine_issues";
            referencedColumns: ["id"];
          },
        ];
      };
      webhooks: {
        Row: {
          id: string;
          name: string;
          url: string;
          secret: string;
          events: string[];
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          secret: string;
          events?: string[];
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          secret?: string;
          events?: string[];
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_deliveries: {
        Row: {
          id: string;
          webhook_id: string;
          event: string;
          payload: Record<string, unknown>;
          response_status: number | null;
          response_body: string | null;
          attempt: number;
          success: boolean;
          delivered_at: string;
        };
        Insert: {
          id?: string;
          webhook_id: string;
          event: string;
          payload: Record<string, unknown>;
          response_status?: number | null;
          response_body?: string | null;
          attempt?: number;
          success?: boolean;
          delivered_at?: string;
        };
        Update: {
          id?: string;
          webhook_id?: string;
          event?: string;
          payload?: Record<string, unknown>;
          response_status?: number | null;
          response_body?: string | null;
          attempt?: number;
          success?: boolean;
          delivered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey";
            columns: ["webhook_id"];
            referencedRelation: "webhooks";
            referencedColumns: ["id"];
          }
        ];
      };
      automation_rules: {
        Row: {
          id: string;
          rule_key: string;
          name: string;
          description: string | null;
          trigger_event: string;
          action_type: string;
          config: Record<string, unknown>;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rule_key: string;
          name: string;
          description?: string | null;
          trigger_event: string;
          action_type: string;
          config?: Record<string, unknown>;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rule_key?: string;
          name?: string;
          description?: string | null;
          trigger_event?: string;
          action_type?: string;
          config?: Record<string, unknown>;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // ── Automation run log (migration 041) ───────────────────────────────
      automation_runs: {
        Row: {
          id: string;
          automation_id: string | null;
          rule_key: string | null;
          event: string;
          action: string;
          status: "success" | "failed" | "skipped";
          error: string | null;
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          automation_id?: string | null;
          rule_key?: string | null;
          event: string;
          action: string;
          status: "success" | "failed" | "skipped";
          error?: string | null;
          payload?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          automation_id?: string | null;
          rule_key?: string | null;
          event?: string;
          action?: string;
          status?: "success" | "failed" | "skipped";
          error?: string | null;
          payload?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
      // ── Phase 11: Bookmarks ──────────────────────────────────────────────
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          article_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          article_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          article_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      // ── Phase 11: Contact form submissions ───────────────────────────────
      contact_submissions: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          ip: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          ip?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          subject?: string;
          message?: string;
          ip?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // ── Phase 12: A/B Tests (persistent storage) ─────────────────────────
      ab_tests: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          variants: Json;
          status: "draft" | "running" | "paused" | "completed";
          target_metric: string | null;
          started_at: string | null;
          ended_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          variants: Json;
          status?: "draft" | "running" | "paused" | "completed";
          target_metric?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          variants?: Json;
          status?: "draft" | "running" | "paused" | "completed";
          target_metric?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ab_test_assignments: {
        Row: {
          id: number;
          test_id: string;
          subject_id: string;
          variant_key: string;
          assigned_at: string;
        };
        Insert: {
          id?: number;
          test_id: string;
          subject_id: string;
          variant_key: string;
          assigned_at?: string;
        };
        Update: {
          id?: number;
          test_id?: string;
          subject_id?: string;
          variant_key?: string;
          assigned_at?: string;
        };
        Relationships: [];
      };
      ab_test_events: {
        Row: {
          id: number;
          test_id: string | null;
          subject_id: string | null;
          variant_key: string | null;
          event: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          test_id?: string | null;
          subject_id?: string | null;
          variant_key?: string | null;
          event?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          test_id?: string | null;
          subject_id?: string | null;
          variant_key?: string | null;
          event?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // ── Phase 10: Social accounts (Twitter / LinkedIn / Telegram tokens) ─
      social_accounts: {
        Row: {
          id: string;
          platform: "twitter" | "linkedin" | "telegram";
          account_name: string;
          access_token: string;
          refresh_token: string | null;
          token_expires_at: string | null;
          active: boolean;
          metadata: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          platform: "twitter" | "linkedin" | "telegram";
          account_name?: string;
          access_token?: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          active?: boolean;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          platform?: "twitter" | "linkedin" | "telegram";
          account_name?: string;
          access_token?: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          active?: boolean;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
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
      // Phase 1A new enums
      subscription_status: "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete";
      subscription_interval: "monthly" | "annual" | "quarterly";
      discount_type: "percent" | "fixed";
      admin_role: "super_admin" | "editor" | "writer" | "finance" | "advertiser_manager";
      notification_type: "new_subscriber" | "payment_failed" | "subscription_canceled" | "comment_flagged" | "article_published" | "manual_change";
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

export type ArticleSeriesRow    = Tables["article_series"]["Row"];
export type ArticleSeriesInsert = Tables["article_series"]["Insert"];
export type ArticleSeriesUpdate = Tables["article_series"]["Update"];

export type SeriesArticleRow    = Tables["series_articles"]["Row"];
export type SeriesArticleInsert = Tables["series_articles"]["Insert"];
export type SeriesArticleUpdate = Tables["series_articles"]["Update"];

// ── Phase 1A: Content Model ──────────────────────────────────────────────────

export type MagazineSectionRow    = Tables["magazine_sections"]["Row"];
export type MagazineSectionInsert = Tables["magazine_sections"]["Insert"];
export type MagazineSectionUpdate = Tables["magazine_sections"]["Update"];

export type SpreadTemplateRow    = Tables["spread_templates"]["Row"];
export type SpreadTemplateInsert = Tables["spread_templates"]["Insert"];
export type SpreadTemplateUpdate = Tables["spread_templates"]["Update"];

export type MagazineSpreadRow    = Tables["magazine_spreads"]["Row"];
export type MagazineSpreadInsert = Tables["magazine_spreads"]["Insert"];
export type MagazineSpreadUpdate = Tables["magazine_spreads"]["Update"];

export type SpreadRevisionRow    = Tables["spread_revisions"]["Row"];
export type SpreadRevisionInsert = Tables["spread_revisions"]["Insert"];
export type SpreadRevisionUpdate = Tables["spread_revisions"]["Update"];

// ── Phase 1A: Subscriptions ──────────────────────────────────────────────────

export type SubscriptionPlanRow    = Tables["subscription_plans"]["Row"];
export type SubscriptionPlanInsert = Tables["subscription_plans"]["Insert"];
export type SubscriptionPlanUpdate = Tables["subscription_plans"]["Update"];

export type PromoCodeRow    = Tables["promo_codes"]["Row"];
export type PromoCodeInsert = Tables["promo_codes"]["Insert"];
export type PromoCodeUpdate = Tables["promo_codes"]["Update"];

export type SubscriberRow    = Tables["subscribers"]["Row"];
export type SubscriberInsert = Tables["subscribers"]["Insert"];
export type SubscriberUpdate = Tables["subscribers"]["Update"];

export type PaymentRow    = Tables["payments"]["Row"];
export type PaymentInsert = Tables["payments"]["Insert"];
export type PaymentUpdate = Tables["payments"]["Update"];

// ── Phase 1A: Analytics ──────────────────────────────────────────────────────

export type ArticleReadRow    = Tables["article_reads"]["Row"];
export type ArticleReadInsert = Tables["article_reads"]["Insert"];
export type ArticleReadUpdate = Tables["article_reads"]["Update"];

export type MagazineSpreadReadRow    = Tables["magazine_spread_reads"]["Row"];
export type MagazineSpreadReadInsert = Tables["magazine_spread_reads"]["Insert"];
export type MagazineSpreadReadUpdate = Tables["magazine_spread_reads"]["Update"];

// ── Phase 1A: Admin ──────────────────────────────────────────────────────────

export type AdminRoleRow    = Tables["admin_roles"]["Row"];
export type AdminRoleInsert = Tables["admin_roles"]["Insert"];
export type AdminRoleUpdate = Tables["admin_roles"]["Update"];

export type AuditLogRow    = Tables["audit_log"]["Row"];
export type AuditLogInsert = Tables["audit_log"]["Insert"];
export type AuditLogUpdate = Tables["audit_log"]["Update"];

export type AdminNotificationRow    = Tables["admin_notifications"]["Row"];
export type AdminNotificationInsert = Tables["admin_notifications"]["Insert"];
export type AdminNotificationUpdate = Tables["admin_notifications"]["Update"];

// ── Phase 1A: Editorial ──────────────────────────────────────────────────────

export type ArticleAssignmentRow    = Tables["article_assignments"]["Row"];
export type ArticleAssignmentInsert = Tables["article_assignments"]["Insert"];
export type ArticleAssignmentUpdate = Tables["article_assignments"]["Update"];

export type ArticleStatusHistoryRow    = Tables["article_status_history"]["Row"];
export type ArticleStatusHistoryInsert = Tables["article_status_history"]["Insert"];
export type ArticleStatusHistoryUpdate = Tables["article_status_history"]["Update"];

export type CommentRow    = Tables["comments"]["Row"];
export type CommentInsert = Tables["comments"]["Insert"];
export type CommentUpdate = Tables["comments"]["Update"];

// ── Phase 1A: Ads ────────────────────────────────────────────────────────────

export type AdvertiserRow    = Tables["advertisers"]["Row"];
export type AdvertiserInsert = Tables["advertisers"]["Insert"];
export type AdvertiserUpdate = Tables["advertisers"]["Update"];

export type AdCampaignRow    = Tables["ad_campaigns"]["Row"];
export type AdCampaignInsert = Tables["ad_campaigns"]["Insert"];
export type AdCampaignUpdate = Tables["ad_campaigns"]["Update"];

export type AdRow    = Tables["ads"]["Row"];
export type AdInsert = Tables["ads"]["Insert"];
export type AdUpdate = Tables["ads"]["Update"];

// ── Phase 11: Bookmarks & contact + Phase 10: Social ─────────────────────────

export type BookmarkRow    = Tables["bookmarks"]["Row"];
export type BookmarkInsert = Tables["bookmarks"]["Insert"];
export type BookmarkUpdate = Tables["bookmarks"]["Update"];

export type ContactSubmissionRow    = Tables["contact_submissions"]["Row"];
export type ContactSubmissionInsert = Tables["contact_submissions"]["Insert"];
export type ContactSubmissionUpdate = Tables["contact_submissions"]["Update"];

export type SocialAccountRow    = Tables["social_accounts"]["Row"];
export type SocialAccountInsert = Tables["social_accounts"]["Insert"];
export type SocialAccountUpdate = Tables["social_accounts"]["Update"];

// ── Phase 12: A/B Tests ──────────────────────────────────────────────────────

export type ABTestRow    = Tables["ab_tests"]["Row"];
export type ABTestInsert = Tables["ab_tests"]["Insert"];
export type ABTestUpdate = Tables["ab_tests"]["Update"];

export type ABTestAssignmentRow    = Tables["ab_test_assignments"]["Row"];
export type ABTestAssignmentInsert = Tables["ab_test_assignments"]["Insert"];
export type ABTestAssignmentUpdate = Tables["ab_test_assignments"]["Update"];

export type ABTestEventRow    = Tables["ab_test_events"]["Row"];
export type ABTestEventInsert = Tables["ab_test_events"]["Insert"];
export type ABTestEventUpdate = Tables["ab_test_events"]["Update"];
