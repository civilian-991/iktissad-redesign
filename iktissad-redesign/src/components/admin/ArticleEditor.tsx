/**
 * ArticleEditor — single source of truth for the admin article editor.
 *
 * Used by both /admin/articles/[id] (existing draft/published) and
 * /admin/articles/new (which creates a draft server-side and redirects here).
 * Keeping one editor prevents drift between "create" and "edit" surfaces and
 * means features like Yjs collab, presence, version history — all of which
 * require an articleId — work from the moment the page loads.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import {
  ArrowRight,
  Save,
  Eye,
  Clock,
  Calendar,
  Tag,
  FileText,
  Send,
  Trash2,
  History,
  Loader2,
  Languages,
  Sparkles,
  Check,
  AlertCircle,
  RefreshCcw,
  MessageSquare,
  Share2,
  Star,
  Zap,
  User,
  Link as LinkIcon,
  X,
  Plus,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import dynamic from 'next/dynamic';
import ImageUploader from '@/components/admin/ImageUploader';
import MediaPicker from '@/components/admin/MediaPicker';
import AddAuthorModal from '@/components/admin/AddAuthorModal';
import FocalPointSelector from '@/components/admin/spread-editor/FocalPointSelector';
import ArticleAnalyticsPanel from '@/components/admin/ArticleAnalyticsPanel';
import ArticleTypeSelector from '@/components/admin/ArticleTypeSelector';
import ArticleOutlineModal from '@/components/admin/ArticleOutlineModal';
import AISidebar from '@/components/admin/AISidebar';
import AIBubbleMenu from '@/components/admin/AIBubbleMenu';
import EditorialComments from '@/components/admin/EditorialComments';
import SEOPanel from '@/components/admin/SEOPanel';
import GEOPanel from '@/components/admin/GEOPanel';
import SplitPreview from '@/components/admin/SplitPreview';
import PaywallOptimizer from '@/components/admin/PaywallOptimizer';
import AIPerformanceRecommendations from '@/components/admin/AIPerformanceRecommendations';
import ArticleVersionPanel from '@/components/admin/ArticleVersionPanel';
import SharePreviewModal from '@/components/admin/SharePreviewModal';
import FactCheckPanel from '@/components/admin/FactCheckPanel';
import { swrFetcher, updateArticle, deleteArticle, aiTranslate, aiGenerateExcerpt, createArticleVersion, aiAutoTag, aiSummarize, aiGenerateSocialCards } from '@/lib/api-client';
import { slugify } from '@/lib/slugify';
import type { Article, ApiResponse } from '@/types';
import type { JSONContent } from '@tiptap/core';
import { ArticleType } from '@/lib/ai/arabic-editorial';
import type { ArticleTypeConfig } from '@/lib/ai/arabic-editorial';
import { useArticlePresence } from '@/hooks/useArticlePresence';
import PresenceAvatars from '@/components/admin/PresenceAvatars';
import type { MeData } from '@/app/api/auth/me/route';

// TipTap editor is large (~500KB). Dynamic import keeps it out of the initial bundle.
const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-stone-50 border border-stone-200 rounded-lg animate-pulse flex items-center justify-center">
      <Loader2 className="text-stone-400 animate-spin" size={24} />
    </div>
  ),
});

function generateUserColor(userId: string): string {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1',
  ];
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/** Recursively extract plain text from TipTap JSONContent for SEO analysis */
function extractText(node: JSONContent | null | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (!node.content?.length) return '';
  const sep = node.type === 'paragraph' || node.type === 'heading' ? '\n' : ' ';
  return node.content.map(extractText).join(sep);
}

/**
 * Resolve the editor's initial TipTap document from an article.
 *
 * The editor stores its document two ways at save time:
 *   - `body` (jsonb)           — the TipTap JSON object
 *   - `content` (text/string)  — JSON.stringify of the same object (legacy)
 *
 * When loading, prefer `body`. If absent, attempt to parse `content` as JSON
 * (older drafts may still have only this). Fall back to the raw string so
 * pre-TipTap HTML content still renders.
 */
function resolveInitialBody(article: Article): JSONContent | string {
  // body is set by the mapper from row.body (jsonb)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = (article as any).body as JSONContent | string | null | undefined;
  if (body && typeof body === 'object') return body as JSONContent;
  if (typeof body === 'string' && body.trim()) {
    try { return JSON.parse(body) as JSONContent; } catch { /* fall through */ }
  }
  const content = article.content ?? '';
  if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
    try { return JSON.parse(content) as JSONContent; } catch { /* fall through */ }
  }
  return content;
}

const tagKeys = ['breaking', 'exclusive', 'analysis', 'report', 'interview', 'opinion', 'data', 'infographic'] as const;

export default function ArticleEditor({ articleId }: { articleId: string }) {
  const id = articleId;
  const { t } = useTranslation();
  const router = useRouter();

  // Load article data from API
  const { data: articleRes, isLoading } = useSWR<ApiResponse<Article>>(
    `/api/articles/${id}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const article = articleRes?.data;

  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [slug, setSlug] = useState('');
  // While false, the slug auto-follows the title (standard CMS behavior). Set
  // true once the article has a real (non-placeholder) slug or the user edits
  // the slug field manually, so we never clobber an intentional slug.
  const [slugTouched, setSlugTouched] = useState(false);
  const [deck, setDeck] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [excerptEn, setExcerptEn] = useState('');
  const [content, setContent] = useState('');
  // editorBody stores TipTap JSON — the canonical representation passed to the editor.
  const [editorBody, setEditorBody] = useState<JSONContent | string | null>(null);
  const [section, setSection] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [focalX, setFocalX] = useState(0.5);
  const [focalY, setFocalY] = useState(0.5);
  const [status, setStatus] = useState<'draft' | 'review' | 'scheduled' | 'published'>('draft');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [featured, setFeatured] = useState(false);
  const [editorChoice, setEditorChoice] = useState(false);
  const [isBreaking, setIsBreaking] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [noIndex, setNoIndex] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: countriesRes } = useSWR<any>('/api/countries', swrFetcher, { revalidateOnFocus: false });
  const countries: { slug: string; name: string }[] = countriesRes?.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sectionsRes } = useSWR<any>('/api/sections', swrFetcher, { revalidateOnFocus: false });
  const sections: { slug: string; name: string }[] = sectionsRes?.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sectorsRes } = useSWR<any>('/api/sectors', swrFetcher, { revalidateOnFocus: false });
  const sectors: { slug: string; name: string }[] = sectorsRes?.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usersRes } = useSWR<any>('/api/users?pageSize=500', swrFetcher, { revalidateOnFocus: false });
  const users: { id: string; name: string }[] = usersRes?.data ?? [];
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingExcerpt, setIsGeneratingExcerpt] = useState(false);
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingSocialCards, setIsGeneratingSocialCards] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showAddAuthor, setShowAddAuthor] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [articleType, setArticleType] = useState<ArticleType | null>(null);
  const [showOutlineModal, setShowOutlineModal] = useState(false);
  const editorRef = useRef<import('@tiptap/core').Editor | null>(null);
  const [editorInstance, setEditorInstance] = useState<import('@tiptap/core').Editor | null>(null);
  // One-shot guard for seeding the collaborative Y.Doc from API body —
  // see the effect below for why this is necessary.
  const seededFromBodyRef = useRef(false);
  // Snapshot of the body to seed the editor with, captured once when the
  // article loads. We seed from this ref — NOT from the live `editorBody`
  // state — because the TipTap Collaboration extension fires an (empty)
  // onUpdate while binding the fresh Y.Doc, which would otherwise overwrite
  // editorBody to an empty doc before the seed runs, leaving the body blank.
  const initialBodyRef = useRef<JSONContent | string | null>(null);

  const { data: meRes } = useSWR<ApiResponse<MeData>>(
    '/api/auth/me',
    swrFetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const currentUser = meRes?.data
    ? { userId: meRes.data.id, name: meRes.data.name, avatarUrl: meRes.data.avatarUrl }
    : null;

  const { presentUsers } = useArticlePresence({ articleId: id, currentUser });

  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [showSplitPreview, setShowSplitPreview] = useState(false);
  const [editorialCommentsOpen, setEditorialCommentsOpen] = useState(false);
  const [contentText, setContentText] = useState('');
  const [seoKeyword, setSeoKeyword] = useState('');

  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const lastSavedHashRef = useRef<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getContentHash = useCallback(() =>
    JSON.stringify({ title, titleEn, slug, deck, excerpt, excerptEn, content, section, selectedSector, selectedTags, selectedCountry, selectedAuthorId, featured, editorChoice, isBreaking, scheduledAt, metaTitle, metaDescription, ogImage, canonicalUrl, noIndex }),
    [title, titleEn, slug, deck, excerpt, excerptEn, content, section, selectedSector, selectedTags, selectedCountry, selectedAuthorId, featured, editorChoice, isBreaking, scheduledAt, metaTitle, metaDescription, ogImage, canonicalUrl, noIndex]
  );

  const buildSavePayload = useCallback(() => ({
    title, titleEn, slug: slug || undefined, deck: deck || undefined, excerpt, excerptEn: excerptEn || undefined,
    content,
    ...(editorBody && typeof editorBody === 'object' ? { body: editorBody } : {}),
    sectionSlug: section || undefined,
    sectorSlug: selectedSector || undefined,
    countrySlug: selectedCountry || undefined,
    authorId: selectedAuthorId || undefined,
    tags: selectedTags,
    featuredImage: featuredImage || '',
    status,
    publishedAt: status === 'scheduled' && scheduledAt ? scheduledAt : undefined,
    featuredImageFocalX: focalX,
    featuredImageFocalY: focalY,
    featured,
    editorChoice,
    isBreaking,
    metaTitle: metaTitle || undefined,
    metaDescription: metaDescription || undefined,
    ogImage: ogImage || undefined,
    canonicalUrl: canonicalUrl || undefined,
    noIndex,
    ...(articleType ? { article_type: articleType } : {}),
  }), [title, titleEn, slug, deck, excerpt, excerptEn, content, editorBody, section, selectedSector, selectedCountry, selectedAuthorId, selectedTags, featuredImage, status, scheduledAt, focalX, focalY, featured, editorChoice, isBreaking, metaTitle, metaDescription, ogImage, canonicalUrl, noIndex, articleType]);

  const performAutoSave = useCallback(async () => {
    if (!title.trim()) return;
    const hash = getContentHash();
    if (hash === lastSavedHashRef.current) return;
    setAutoSaveStatus('saving');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateArticle(id, buildSavePayload() as any);
      lastSavedHashRef.current = hash;
      setAutoSaveStatus('saved');
    } catch {
      setAutoSaveStatus('error');
    }
  }, [id, buildSavePayload, getContentHash, title]);

  useEffect(() => {
    if (!initialized || !title.trim()) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('idle');
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 30_000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, titleEn, slug, deck, excerpt, excerptEn, content, section, selectedSector, selectedTags, selectedCountry, selectedAuthorId, featuredImage, focalX, focalY, featured, editorChoice, isBreaking, scheduledAt, initialized, performAutoSave]);

  // Populate form when article loads
  useEffect(() => {
    if (article && !initialized) {
      setTitle(article.title);
      setTitleEn(article.titleEn || '');
      // A `draft-<uuid>` placeholder slug (assigned at creation) is not a real
      // slug — derive one from the title and let it keep following the title
      // until the user edits it. A real slug is kept as-is and locked.
      const hasRealSlug = !!article.slug && !article.slug.startsWith('draft-');
      setSlug(hasRealSlug ? article.slug : slugify(article.title || ''));
      setSlugTouched(hasRealSlug);
      setDeck(article.deck || '');
      setExcerpt(article.excerpt);
      setExcerptEn(article.excerptEn || '');
      // Resolve canonical TipTap doc from body/content (see resolveInitialBody).
      const initialBody = resolveInitialBody(article);
      initialBodyRef.current = initialBody;
      setEditorBody(initialBody);
      setContent(typeof initialBody === 'string' ? initialBody : JSON.stringify(initialBody));
      setSection(article.sectionSlug || '');
      setSelectedSector(article.sectorSlug || '');
      setSelectedAuthorId(article.author?.id || '');
      setSelectedTags(article.tags || []);
      setFeaturedImage(article.featuredImage || null);
      setStatus(article.status);
      setFeatured(article.featured ?? false);
      setEditorChoice(article.editorChoice ?? false);
      setIsBreaking(article.isBreaking ?? false);
      if (article.publishedAt && article.status === 'scheduled') {
        setScheduledAt(article.publishedAt.slice(0, 16));
      }
      if (article.countrySlug) setSelectedCountry(article.countrySlug);
      if (article.articleType) setArticleType(article.articleType as ArticleType);
      if (article.featuredImageFocalX !== undefined) setFocalX(article.featuredImageFocalX);
      if (article.featuredImageFocalY !== undefined) setFocalY(article.featuredImageFocalY);
      setMetaTitle(article.metaTitle || '');
      setMetaDescription(article.metaDescription || '');
      setOgImage(article.ogImage || '');
      setCanonicalUrl(article.canonicalUrl || '');
      setNoIndex(article.noIndex ?? false);
      // Seed contentText for SEO/Fact-check panels with the initial body's plain text.
      if (typeof initialBody !== 'string') setContentText(extractText(initialBody));
      setInitialized(true);
    }
  }, [article, initialized]);

  // Seed the collaborative Y.Doc from the loaded article body when no peer
  // is available to sync with. SupabaseProvider (src/lib/collab/SupabaseProvider.ts)
  // syncs via Realtime broadcast and has NO persistence — Yjs state only
  // lives in the memory of currently-connected peers. So closing the tab
  // and reopening leaves Yjs empty even though `body` is in the database,
  // and the editor renders blank. After a short window for peer sync to
  // arrive, if the editor is still empty, hydrate from the API body. The
  // ref guards against re-seeding if the user starts typing first.
  useEffect(() => {
    if (seededFromBodyRef.current) return;
    if (!initialized || !editorInstance || !currentUser) return;
    // Seed from the snapshot captured at load time — accept TipTap JSON
    // (object) or legacy HTML (non-empty string). An empty body means there's
    // nothing to seed.
    const seed = initialBodyRef.current;
    const hasSeed =
      (seed !== null && typeof seed === 'object') ||
      (typeof seed === 'string' && seed.trim().length > 0);
    if (!hasSeed) {
      seededFromBodyRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      if (seededFromBodyRef.current) return;
      if (editorInstance.isDestroyed) return;
      // If a peer already synced real content, leave it alone.
      if (editorInstance.isEmpty) {
        editorInstance.commands.setContent(seed as JSONContent | string, { emitUpdate: true });
      }
      seededFromBodyRef.current = true;
    }, 1500);
    return () => clearTimeout(timer);
  }, [initialized, editorInstance, currentUser]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const tag = customTagInput.trim();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setCustomTagInput('');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('admin.articles.editor.titleRequired'));
      return;
    }
    setIsSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateArticle(id, buildSavePayload() as any);
      toast.success(t('admin.articles.editor.saveSuccess'));
      void createArticleVersion(id).catch(() => {/* silent — versioning is best-effort */});
      if (status === 'published' && content.trim()) {
        void aiSummarize(id, content, title).catch(() => {/* silent — summary is best-effort */});
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || t('admin.common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleArticleTypeChange = useCallback(
    (type: ArticleType, config: ArticleTypeConfig) => {
      setArticleType(type);
      toast.success(`${t('admin.articles.editor.articleTypeChanged')} ${config.arabicLabel}`);
      setShowOutlineModal(true);
    },
    [t]
  );

  const handleOutlineInsert = useCallback((html: string) => {
    setShowOutlineModal(false);
    if (editorRef.current) {
      editorRef.current.commands.setContent(html, { emitUpdate: false });
    }
  }, []);

  const handleDelete = async () => {
    try {
      await deleteArticle(id);
      toast.success(t('admin.articles.actions.deleted'));
      router.push('/admin/articles');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || t('admin.common.error'));
    }
  };

  const handleVersionRestore = useCallback(() => {
    toast.success(t('admin.articles.editor.versionRestored'));
    router.refresh();
  }, [router, t]);

  const handleMediaSelect = useCallback((url: string) => {
    if (editorRef.current) {
      editorRef.current.chain().focus().setImage({ src: url, alt: '' }).run();
    }
  }, []);

  const handleTranslateTitle = async () => {
    if (!title.trim()) {
      toast.error(t('admin.articles.editor.ai.noTitle'));
      return;
    }
    setIsTranslating(true);
    try {
      const res = await aiTranslate(title, 'ar', 'en');
      if (res.data?.translatedText) {
        setTitleEn(res.data.translatedText);
        toast.success(t('admin.articles.editor.ai.translateSuccess'));
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || t('admin.articles.editor.ai.translateError'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateExcerpt = async () => {
    if (!content.trim()) {
      toast.error(t('admin.articles.editor.ai.noContent'));
      return;
    }
    setIsGeneratingExcerpt(true);
    try {
      const res = await aiGenerateExcerpt(content, 'ar');
      if (res.data?.excerpt) {
        setExcerpt(res.data.excerpt);
        toast.success(t('admin.articles.editor.ai.excerptSuccess'));
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || t('admin.articles.editor.ai.excerptError'));
    } finally {
      setIsGeneratingExcerpt(false);
    }
  };

  const handleAutoTag = async () => {
    if (!content.trim() && !title.trim()) {
      toast.error(t('admin.articles.editor.ai.addTitleOrContent'));
      return;
    }
    setIsAutoTagging(true);
    try {
      const res = await aiAutoTag(content || title, title, selectedTags);
      if (res.data?.tags?.length) {
        const newTags = res.data.tags.filter((t) => !selectedTags.includes(t));
        if (newTags.length === 0) {
          toast.info(t('admin.articles.editor.ai.noNewTags'));
        } else {
          setSelectedTags((prev) => [...prev, ...newTags]);
          toast.success(t('admin.articles.editor.ai.tagsAdded').replace('{count}', String(newTags.length)));
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || t('admin.articles.editor.ai.tagsFailed'));
    } finally {
      setIsAutoTagging(false);
    }
  };

  const handleSummarize = async () => {
    if (!content.trim()) {
      toast.error(t('admin.articles.editor.ai.noContent'));
      return;
    }
    setIsSummarizing(true);
    try {
      const res = await aiSummarize(id, content, title);
      if (res.data?.summary) {
        toast.success(t('admin.articles.editor.ai.summarizeSuccess'));
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || t('admin.articles.editor.ai.summarizeFailed'));
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateSocialCards = async () => {
    if (!title.trim()) {
      toast.error(t('admin.articles.editor.titleRequired'));
      return;
    }
    setIsGeneratingSocialCards(true);
    try {
      const res = await aiGenerateSocialCards(id, title, featuredImage || undefined);
      if (res.data?.twitter) {
        setOgImage(res.data.twitter);
        toast.success(t('admin.articles.editor.ai.socialCardsSuccess'));
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || t('admin.articles.editor.ai.socialCardsFailed'));
    } finally {
      setIsGeneratingSocialCards(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-32">
        <FileText size={48} className="mx-auto text-white/20 mb-4" />
        <p className="text-white/40 font-[family-name:var(--font-display)]">
          {t('admin.articles.notFound')}
        </p>
        <Link href="/admin/articles" className="text-gold hover:underline mt-4 inline-block font-[family-name:var(--font-display)]">
          {t('common.actions.back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/articles"
            className="p-2 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
              {t('admin.articles.editor.editArticle')}
            </h1>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              #{id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Presence indicator */}
          {presentUsers.length > 0 && (
            <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-profit/10 border border-profit/20 rounded-xl">
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-profit" />
              </span>
              <span className="text-profit text-xs font-[family-name:var(--font-display)] whitespace-nowrap">
                {t('admin.articles.editor.viewingArticle')}
              </span>
              <PresenceAvatars users={presentUsers} maxVisible={4} size={24} />
            </span>
          )}

          {/* Auto-save indicator */}
          {autoSaveStatus === 'saving' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/50 font-[family-name:var(--font-display)]">
              <Loader2 size={12} className="animate-spin" />
              {t('admin.editor.autoSaving')}
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-profit font-[family-name:var(--font-display)]">
              <Check size={12} />
              {t('admin.editor.autoSaved')}
            </span>
          )}
          {autoSaveStatus === 'error' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-loss font-[family-name:var(--font-display)]">
              <AlertCircle size={12} />
              {t('admin.editor.saveFailed')}
              <button onClick={performAutoSave} className="underline hover:no-underline flex items-center gap-1">
                <RefreshCcw size={10} />
                {t('admin.editor.retry')}
              </button>
            </span>
          )}

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-[family-name:var(--font-display)] text-sm"
            title={t('admin.articles.editor.shareForReview')}
          >
            <Share2 size={16} />
            {t('admin.articles.editor.share')}
          </button>
          <button
            onClick={() => setVersionPanelOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all font-[family-name:var(--font-display)] text-sm ${
              versionPanelOpen
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-white/5 border-gold/10 text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title={t('admin.articles.editor.versionHistory')}
          >
            <History size={16} />
            {t('admin.articles.editor.versions')}
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-loss/10 border border-loss/20 rounded-xl text-loss hover:bg-loss/20 transition-all font-[family-name:var(--font-display)] text-sm"
          >
            <Trash2 size={16} />
            {t('admin.articles.actions.delete')}
          </button>
          <button
            onClick={() => setShowSplitPreview(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-[family-name:var(--font-display)] text-sm"
          >
            <Eye size={16} />
            {t('admin.articles.editor.livePreview')}
          </button>
          <button
            onClick={() => setEditorialCommentsOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all font-[family-name:var(--font-display)] text-sm ${
              editorialCommentsOpen
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-white/5 border-gold/10 text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title={t('admin.articles.editor.editorialComments')}
          >
            <MessageSquare size={16} />
            {t('admin.articles.editor.comments')}
          </button>
          <a
            href={`/${article.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-[family-name:var(--font-display)] text-sm"
          >
            <Eye size={16} />
            {t('admin.articles.actions.preview')}
          </a>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Save size={16} />
              </motion.div>
            ) : (
              <Save size={16} />
            )}
            {t('admin.articles.editor.saveChanges')}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: t('admin.articles.table.stats'), value: article.views.toLocaleString(), icon: Eye, color: 'text-gold' },
          { label: t('admin.articles.table.date'), value: article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn') : '-', icon: Calendar, color: 'text-teal' },
          { label: t('admin.articles.table.status'), value: t(`admin.articles.status.${article.status}`), icon: Send, color: 'text-profit' },
          { label: t('admin.articles.table.section'), value: article.section || '-', icon: FileText, color: 'text-purple-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-midnight/50 border border-gold/10 rounded-xl p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">{stat.label}</p>
              <p className="text-white font-[family-name:var(--font-display)] font-semibold">{stat.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Article Type Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <ArticleTypeSelector
              value={articleType}
              onChange={handleArticleTypeChange}
              showWordCount={true}
            />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.titleLabel')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                const v = e.target.value;
                setTitle(v);
                // Slug follows the title until the user takes over the slug field.
                if (!slugTouched) setSlug(slugify(v));
              }}
              placeholder={t('admin.articles.editor.titlePlaceholder')}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-4 px-5 text-white text-xl font-[family-name:var(--font-display)] font-bold placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder={t('admin.articles.editor.titleEnPlaceholder')}
                className="flex-1 bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
              />
              <button
                onClick={handleTranslateTitle}
                disabled={isTranslating || !title.trim()}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border border-gold/20 rounded-xl text-gold text-xs font-[family-name:var(--font-display)] hover:bg-gold/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                title={t('admin.articles.editor.ai.translateTitle')}
              >
                {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
                {isTranslating ? t('admin.articles.editor.ai.translating') : t('admin.articles.editor.ai.translateTitle')}
              </button>
            </div>
          </motion.div>

          {/* Slug + Deck */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4"
          >
            <div>
              <label className="flex items-center gap-2 text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                <LinkIcon size={14} />
                {t('admin.articles.editor.slugLabel')}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-sm font-[family-name:var(--font-display)] shrink-0">/news/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                  placeholder="article-slug"
                  dir="ltr"
                  className="flex-1 bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-mono placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                {t('admin.articles.editor.deckLabel')}
              </label>
              <input
                type="text"
                value={deck}
                onChange={(e) => setDeck(e.target.value)}
                placeholder={t('admin.articles.editor.deckPlaceholder')}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>
          </motion.div>

          {/* Excerpt */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)]">
                {t('admin.articles.editor.excerptLabel')}
              </label>
              <button
                onClick={handleGenerateExcerpt}
                disabled={isGeneratingExcerpt || !content.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-gold/20 rounded-lg text-gold text-xs font-[family-name:var(--font-display)] hover:bg-gold/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('admin.articles.editor.ai.generateExcerpt')}
              >
                {isGeneratingExcerpt ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isGeneratingExcerpt ? t('admin.articles.editor.ai.generatingExcerpt') : t('admin.articles.editor.ai.generateExcerpt')}
              </button>
            </div>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder={t('admin.articles.editor.excerptPlaceholder')}
              rows={3}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors resize-none"
            />
            <textarea
              value={excerptEn}
              onChange={(e) => setExcerptEn(e.target.value)}
              placeholder="Excerpt in English (EN)…"
              rows={2}
              dir="ltr"
              className="mt-2 w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors resize-none"
            />
          </motion.div>

          {/* Content Editor — TipTap + AI Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 items-start"
          >
            <div className="flex-1 min-w-0">
              <RichTextEditor
                value={editorBody ?? ''}
                onChange={(json) => {
                  setEditorBody(json);
                  setContent(JSON.stringify(json));
                  setContentText(extractText(json));
                }}
                onEditorMount={(editor) => {
                  editorRef.current = editor;
                  setEditorInstance(editor);
                }}
                placeholder={t('admin.articles.editor.contentPlaceholder')}
                dir="rtl"
                minHeight={400}
                onImageInsert={() => setShowMediaPicker(true)}
                collaborative={
                  currentUser
                    ? {
                        articleId: id,
                        user: {
                          id: currentUser.userId,
                          name: currentUser.name,
                          color: generateUserColor(currentUser.userId),
                        },
                      }
                    : undefined
                }
              />
              {editorInstance && (
                <AIBubbleMenu
                  editor={editorInstance}
                  articleType={articleType ?? undefined}
                />
              )}
            </div>
            <AISidebar
              editor={editorInstance}
              articleType={articleType ?? undefined}
              isOpen={aiSidebarOpen}
              onToggle={() => setAiSidebarOpen((v) => !v)}
            />
            <EditorialComments
              articleId={id}
              currentUserId={currentUser?.userId}
              isOpen={editorialCommentsOpen}
              onToggle={() => setEditorialCommentsOpen((v) => !v)}
            />
            <ArticleVersionPanel
              articleId={id}
              isOpen={versionPanelOpen}
              onToggle={() => setVersionPanelOpen((v) => !v)}
              currentTitle={title}
              currentContent={content}
              onRestoreComplete={handleVersionRestore}
            />
          </motion.div>

          {/* Article Analytics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ArticleAnalyticsPanel articleId={id} />
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Featured Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.featuredImage')}
            </label>
            <ImageUploader
              bucket="articles"
              folder="featured"
              currentImage={featuredImage}
              onUpload={(url) => setFeaturedImage(url)}
              onRemove={() => setFeaturedImage(null)}
            />
            {featuredImage && (
              <div className="mt-4">
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.articles.editor.focalPoint')}
                </label>
                <FocalPointSelector
                  imageUrl={featuredImage}
                  focalX={focalX}
                  focalY={focalY}
                  onChange={(x, y) => { setFocalX(x); setFocalY(y); }}
                />
              </div>
            )}
          </motion.div>

          {/* Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.sectionLabel')}
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            >
              <option value="" className="bg-midnight">{t('admin.articles.editor.selectSection')}</option>
              {sections.map((s) => (
                <option key={s.slug} value={s.slug} className="bg-midnight">{s.name}</option>
              ))}
            </select>
          </motion.div>

          {/* Sector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.sectorLabel')}
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            >
              <option value="" className="bg-midnight">{t('admin.articles.editor.noSector')}</option>
              {sectors.map((s) => (
                <option key={s.slug} value={s.slug} className="bg-midnight">{s.name}</option>
              ))}
            </select>
          </motion.div>

          {/* Country */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.countryLabel')}
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            >
              <option value="" className="bg-midnight">{t('admin.articles.editor.selectCountry')}</option>
              {countries.map((c) => (
                <option key={c.slug} value={c.slug} className="bg-midnight">{c.name}</option>
              ))}
            </select>
          </motion.div>

          {/* Author */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="flex items-center gap-2 text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              <User size={14} />
              {t('admin.articles.editor.authorLabel')}
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedAuthorId}
                onChange={(e) => setSelectedAuthorId(e.target.value)}
                className="flex-1 bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
              >
                <option value="" className="bg-midnight">{t('admin.articles.editor.noAuthor')}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-midnight">{u.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddAuthor(true)}
                title={t('admin.articles.editor.addAuthor')}
                aria-label={t('admin.articles.editor.addAuthor')}
                className="shrink-0 p-3 bg-gold/10 border border-gold/20 rounded-xl text-gold hover:bg-gold/20 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </motion.div>

          {/* Tags */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-white/70 text-sm font-[family-name:var(--font-display)]">
                <Tag size={14} />
                {t('admin.articles.editor.tagsLabel')}
              </label>
              <button
                onClick={handleAutoTag}
                disabled={isAutoTagging}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-gold/20 rounded-lg text-gold text-xs font-[family-name:var(--font-display)] hover:bg-gold/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('admin.articles.editor.ai.suggestTagsTitle')}
              >
                {isAutoTagging ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {isAutoTagging ? t('admin.articles.editor.ai.suggesting') : t('admin.articles.editor.ai.smartSuggest')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {tagKeys.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-gold text-obsidian'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-gold/10'
                  }`}
                >
                  {t(`admin.articles.tags.${tag}`)}
                </button>
              ))}
            </div>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {selectedTags.filter(t => !tagKeys.includes(t as any)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {selectedTags.filter(t => !tagKeys.includes(t as any)).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gold/15 text-gold text-xs font-[family-name:var(--font-display)] border border-gold/20">
                    {tag}
                    <button onClick={() => toggleTag(tag)} className="hover:text-white transition-colors"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); }}}
                placeholder={t('admin.articles.editor.customTagPlaceholder')}
                className="flex-1 bg-white/5 border border-gold/10 rounded-lg py-1.5 px-3 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
              />
              <button
                onClick={addCustomTag}
                disabled={!customTagInput.trim()}
                className="p-1.5 bg-white/5 border border-gold/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
          </motion.div>

          {/* Fact-Check Panel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <FactCheckPanel articleId={id} content={contentText} title={title} />
          </motion.div>

          {/* AI Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Sparkles size={15} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-[family-name:var(--font-display)] font-semibold">{t('admin.articles.editor.ai.smartSummaryTitle')}</p>
                  <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">{t('admin.articles.editor.ai.smartSummaryDesc')}</p>
                </div>
              </div>
              <button
                onClick={handleSummarize}
                disabled={isSummarizing || !content.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 text-xs font-[family-name:var(--font-display)] hover:bg-purple-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSummarizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {isSummarizing ? t('admin.articles.editor.ai.generating') : t('admin.articles.editor.ai.generateSummary')}
              </button>
            </div>
            <p className="text-white/30 text-xs font-[family-name:var(--font-display)] leading-relaxed">
              {t('admin.articles.editor.ai.smartSummaryHint')}
            </p>
          </motion.div>

          {/* SEO Metadata */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.47 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-4">
              {t('admin.articles.editor.seo.title')}
            </label>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-white/50 text-xs font-[family-name:var(--font-display)]">{t('admin.articles.editor.seo.metaTitle')}</label>
                  <span className={`text-[10px] tabular-nums ${metaTitle.length > 65 ? 'text-loss' : metaTitle.length > 55 ? 'text-gold' : 'text-white/30'}`}>
                    {metaTitle.length}/65
                  </span>
                </div>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={title ? `${title} | ${t('common.brand.name')}` : t('admin.articles.editor.seo.metaTitlePlaceholder')}
                  className="w-full bg-white/5 border border-gold/10 rounded-lg py-2 px-3 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/20 focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-white/50 text-xs font-[family-name:var(--font-display)]">{t('admin.articles.editor.seo.metaDescription')}</label>
                  <span className={`text-[10px] tabular-nums ${metaDescription.length > 160 ? 'text-loss' : metaDescription.length > 140 ? 'text-gold' : 'text-white/30'}`}>
                    {metaDescription.length}/160
                  </span>
                </div>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder={excerpt || t('admin.articles.editor.seo.metaDescPlaceholder')}
                  rows={3}
                  className="w-full bg-white/5 border border-gold/10 rounded-lg py-2 px-3 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/20 focus:outline-none focus:border-gold/30 transition-colors resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-white/50 text-xs font-[family-name:var(--font-display)]">{t('admin.articles.editor.seo.ogImage')}</label>
                  <button
                    onClick={handleGenerateSocialCards}
                    disabled={isGeneratingSocialCards || !title.trim()}
                    className="flex items-center gap-1 px-2 py-1 bg-teal/10 border border-teal/20 rounded-lg text-teal text-[10px] font-[family-name:var(--font-display)] hover:bg-teal/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title={t('admin.articles.editor.seo.generateSocialCards')}
                  >
                    {isGeneratingSocialCards ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    {isGeneratingSocialCards ? t('admin.articles.editor.ai.generating') : t('admin.articles.editor.ai.generateCard')}
                  </button>
                </div>
                <input
                  type="url"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder={featuredImage || 'https://…'}
                  dir="ltr"
                  className="w-full bg-white/5 border border-gold/10 rounded-lg py-2 px-3 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-gold/30 transition-colors"
                />
                {ogImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ogImage} alt="OG preview" className="mt-2 rounded-lg w-full h-24 object-cover opacity-70" />
                )}
              </div>

              <div>
                <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-1">{t('admin.articles.editor.seo.canonicalUrl')}</label>
                <input
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder={`https://iktissadonline.com/${slug || '…'}`}
                  dir="ltr"
                  className="w-full bg-white/5 border border-gold/10 rounded-lg py-2 px-3 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>

              {/* Google snippet preview */}
              <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-right" dir="rtl">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-2">{t('admin.articles.editor.seo.searchPreview')}</p>
                <p className="text-[13px] font-medium text-blue-400 leading-snug truncate">
                  {(metaTitle || title || t('admin.articles.editor.seo.articleTitleFallback')).slice(0, 65)}
                </p>
                <p className="text-[11px] text-green-500 mt-0.5 mb-1">
                  iktissadonline.com › {slug || 'article-slug'}
                </p>
                <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-2">
                  {(metaDescription || excerpt || t('admin.articles.editor.seo.descriptionFallback')).slice(0, 160)}
                </p>
              </div>

              {/* noindex toggle */}
              <button
                type="button"
                onClick={() => setNoIndex(!noIndex)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right ${noIndex ? 'bg-loss/10 border border-loss/30' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${noIndex ? 'bg-loss border-loss' : 'border-white/20'}`}>
                  {noIndex && <Check size={10} className="text-white" />}
                </div>
                <div className="flex-1 text-right">
                  <p className={`text-sm font-[family-name:var(--font-display)] font-medium ${noIndex ? 'text-loss' : 'text-white/70'}`}>
                    {t('admin.articles.editor.noIndexLabel')}
                  </p>
                  <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">{t('admin.articles.editor.noIndexHint')}</p>
                </div>
              </button>
            </div>
          </motion.div>

          {/* SEO Analysis Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <SEOPanel
              content={contentText}
              title={title}
              excerpt={excerpt}
              targetKeyword={seoKeyword}
              articleType={articleType ?? undefined}
              sectionSlug={section || undefined}
              currentArticleId={id}
              onTargetKeywordChange={setSeoKeyword}
              onEntityClick={(entity) => {
                if (!selectedTags.includes(entity)) {
                  setSelectedTags((prev) => [...prev, entity]);
                  toast.success(t('admin.articles.editor.entityAddedAsTag').replace('{entity}', entity));
                }
              }}
            />
          </motion.div>

          {/* GEO Panel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.37 }}>
            <GEOPanel
              articleId={id}
              title={title}
              content={contentText}
              articleType={articleType ?? undefined}
              keyword={seoKeyword || undefined}
            />
          </motion.div>

          {/* Paywall Optimizer */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <PaywallOptimizer articleId={id} articleStatus={status} />
          </motion.div>

          {/* AI Performance Recommendations */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <AIPerformanceRecommendations articleId={id} articleStatus={status} />
          </motion.div>

          {/* Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.statusLabel')}
            </label>
            <div className="space-y-2">
              {[
                { value: 'draft' as const, labelKey: 'draft', icon: FileText, color: 'text-white/60' },
                { value: 'review' as const, labelKey: 'review', icon: Clock, color: 'text-gold' },
                { value: 'scheduled' as const, labelKey: 'scheduled', icon: Calendar, color: 'text-teal' },
                { value: 'published' as const, labelKey: 'published', icon: Send, color: 'text-profit' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    status === opt.value
                      ? 'bg-gold/10 border border-gold/30'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={status === opt.value}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="sr-only"
                  />
                  <opt.icon size={16} className={opt.color} />
                  <span className={`font-[family-name:var(--font-display)] text-sm ${status === opt.value ? 'text-gold' : 'text-white/70'}`}>
                    {t(`admin.articles.status.${opt.labelKey}`)}
                  </span>
                </label>
              ))}
            </div>
            {status === 'scheduled' && (
              <div className="mt-3 pt-3 border-t border-gold/10">
                <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-1.5">
                  {t('admin.articles.editor.scheduleDateLabel')}
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-white/5 border border-gold/10 rounded-lg py-2 px-3 text-white text-sm font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>
            )}
          </motion.div>

          {/* Flags */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.articles.editor.articleProperties')}
            </label>
            <div className="space-y-2">
              {[
                { label: t('admin.articles.editor.flagFeatured'), desc: t('admin.articles.editor.flagFeaturedDesc'), value: featured, set: setFeatured, icon: Star, color: 'text-gold' },
                { label: t('admin.articles.editor.flagEditorChoice'), desc: t('admin.articles.editor.flagEditorChoiceDesc'), value: editorChoice, set: setEditorChoice, icon: Check, color: 'text-profit' },
                { label: t('admin.articles.editor.flagBreaking'), desc: t('admin.articles.editor.flagBreakingDesc'), value: isBreaking, set: setIsBreaking, icon: Zap, color: 'text-loss' },
              ].map((flag) => (
                <button
                  key={flag.label}
                  type="button"
                  onClick={() => flag.set(!flag.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right ${
                    flag.value
                      ? 'bg-gold/10 border border-gold/30'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${flag.value ? 'bg-gold/20' : 'bg-white/5'}`}>
                    <flag.icon size={15} className={flag.value ? flag.color : 'text-white/40'} />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className={`text-sm font-[family-name:var(--font-display)] font-medium ${flag.value ? 'text-gold' : 'text-white/70'}`}>{flag.label}</p>
                    <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">{flag.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${flag.value ? 'bg-gold border-gold' : 'border-white/20'}`}>
                    {flag.value && <Check size={10} className="text-obsidian" />}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <SharePreviewModal
        articleId={id}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      <SplitPreview
        content={typeof editorBody === 'object' ? editorBody : null}
        title={title}
        excerpt={excerpt}
        featuredImageUrl={featuredImage ?? undefined}
        articleType={articleType ?? undefined}
        isOpen={showSplitPreview}
        onClose={() => setShowSplitPreview(false)}
        articleId={id}
      />

      {showOutlineModal && articleType && (
        <ArticleOutlineModal
          open={showOutlineModal}
          articleType={articleType}
          onInsert={handleOutlineInsert}
          onCancel={() => setShowOutlineModal(false)}
        />
      )}

      <MediaPicker
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        bucket="articles"
        folder="content"
      />

      {showAddAuthor && (
        <AddAuthorModal
          onClose={() => setShowAddAuthor(false)}
          onCreated={(author) => {
            setSelectedAuthorId(author.id);
            void globalMutate('/api/users?pageSize=500');
          }}
        />
      )}

      {showDeleteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-midnight border border-gold/10 rounded-2xl p-6 max-w-md w-full"
          >
            <div className="w-12 h-12 bg-loss/10 rounded-xl flex items-center justify-center mb-4">
              <Trash2 className="text-loss" size={24} />
            </div>
            <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-white mb-2">
              {t('admin.articles.deleteModal.title')}
            </h3>
            <p className="text-white/60 text-sm font-[family-name:var(--font-display)] mb-6">
              {t('admin.articles.deleteModal.message')}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-xl font-[family-name:var(--font-display)] text-sm hover:bg-white/10 transition-colors"
              >
                {t('common.actions.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-loss text-white rounded-xl font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-loss/90 transition-colors"
              >
                {t('admin.articles.actions.delete')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
