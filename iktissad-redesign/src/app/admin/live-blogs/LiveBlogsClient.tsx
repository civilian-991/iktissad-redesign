'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Radio, Plus, Square, Send, Clock, User, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import {
  swrFetcher,
  createLiveBlog,
  updateLiveBlog,
  postLiveBlogUpdate,
} from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import type { ApiResponse } from '@/types';

interface LiveBlogItem {
  id: string;
  article_id: string;
  status: 'active' | 'ended';
  started_at: string;
  ended_at: string | null;
  articles?: { id: string; title: string; slug: string; featured_image?: string } | null;
}

interface LiveBlogUpdate {
  id: string;
  content: string;
  created_at: string;
  users?: { name: string; avatar?: string } | null;
}

export default function LiveBlogsClient() {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [articleId, setArticleId] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<string | null>(null);
  const [updateContent, setUpdateContent] = useState('');
  const [posting, setPosting] = useState(false);

  const { data, mutate } = useSWR<ApiResponse<LiveBlogItem[]>>(
    '/api/live-blogs',
    swrFetcher
  );

  const blogs = (data?.data ?? []) as unknown as LiveBlogItem[];

  // Fetch updates for selected blog
  const { data: blogDetail, mutate: mutateBlog } = useSWR<ApiResponse<LiveBlogItem & { updates: LiveBlogUpdate[] }>>(
    selectedBlog ? `/api/live-blogs/${selectedBlog}` : null,
    swrFetcher,
    { refreshInterval: 5000 }
  );

  const updates = (blogDetail?.data as unknown as { updates: LiveBlogUpdate[] })?.updates ?? [];

  const handleCreate = useCallback(async () => {
    if (!articleId.trim()) return;
    setCreating(true);
    try {
      await createLiveBlog({ articleId: articleId.trim() });
      toast.success('تم بدء البث المباشر');
      setShowCreate(false);
      setArticleId('');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل في بدء البث');
    } finally {
      setCreating(false);
    }
  }, [articleId, mutate]);

  const handleEnd = useCallback(async (blogId: string) => {
    try {
      await updateLiveBlog(blogId, { status: 'ended' });
      toast.success('تم إنهاء البث المباشر');
      mutate();
      if (selectedBlog === blogId) mutateBlog();
    } catch {
      toast.error('خطأ في الاتصال');
    }
  }, [mutate, mutateBlog, selectedBlog]);

  const handlePostUpdate = useCallback(async () => {
    if (!selectedBlog || !updateContent.trim()) return;
    setPosting(true);
    try {
      await postLiveBlogUpdate(selectedBlog, { content: updateContent.trim() });
      setUpdateContent('');
      mutateBlog();
      toast.success('تم نشر التحديث');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل نشر التحديث');
    } finally {
      setPosting(false);
    }
  }, [selectedBlog, updateContent, mutateBlog]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1 flex items-center gap-2">
            <Radio size={22} className="text-gold" />
            البث المباشر
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            إدارة التغطيات المباشرة والتحديثات الفورية
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian rounded-xl text-sm font-[family-name:var(--font-display)] font-bold hover:bg-gold-bright transition-colors"
        >
          <Plus size={16} />
          {t('engagement.liveBlog.start_blog')}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-midnight/50 border border-gold/10 rounded-xl p-5"
        >
          <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
            معرّف المقال (Article UUID)
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              placeholder="e.g. a1b2c3d4-..."
              className="flex-1 bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/30"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !articleId.trim()}
              className="px-5 py-2.5 bg-gold text-obsidian rounded-xl text-sm font-[family-name:var(--font-display)] font-bold disabled:opacity-50 hover:bg-gold-bright transition-colors"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : t('engagement.liveBlog.start_blog')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Two-column layout: blogs list + selected blog detail */}
      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6">
        {/* Blogs list */}
        <div className="bg-midnight/50 border border-gold/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gold/10">
            <h2 className="text-sm font-[family-name:var(--font-display)] font-bold text-white/70">
              جميع البثوث ({blogs.length})
            </h2>
          </div>
          <div className="divide-y divide-gold/5 max-h-[500px] overflow-y-auto">
            {blogs.map((blog) => (
              <button
                key={blog.id}
                onClick={() => setSelectedBlog(blog.id)}
                className={`w-full text-right px-4 py-3.5 transition-colors ${
                  selectedBlog === blog.id ? 'bg-gold/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {blog.status === 'active' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-[9px] font-[family-name:var(--font-display)] font-black uppercase tracking-wider rounded-sm">
                      <Radio size={8} className="animate-pulse" />
                      {t('engagement.liveBlog.live')}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-white/10 text-white/40 text-[9px] font-[family-name:var(--font-display)] font-black uppercase tracking-wider rounded-sm">
                      {t('engagement.liveBlog.ended')}
                    </span>
                  )}
                  <span className="text-[10px] text-white/30">
                    {new Date(blog.started_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
                <p className="text-[13px] font-[family-name:var(--font-display)] font-semibold text-white/80 line-clamp-2">
                  {blog.articles?.title || blog.article_id}
                </p>
                {blog.status === 'active' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnd(blog.id);
                    }}
                    className="mt-2 flex items-center gap-1 px-2.5 py-1 text-[10px] font-[family-name:var(--font-display)] font-bold text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 transition-colors"
                  >
                    <Square size={9} />
                    {t('engagement.liveBlog.end_blog')}
                  </button>
                )}
              </button>
            ))}
            {blogs.length === 0 && (
              <div className="px-4 py-8 text-center text-white/30 text-sm font-[family-name:var(--font-display)]">
                لا يوجد بث مباشر حالياً
              </div>
            )}
          </div>
        </div>

        {/* Selected blog detail + post update */}
        <div className="bg-midnight/50 border border-gold/10 rounded-xl overflow-hidden">
          {selectedBlog ? (
            <>
              {/* Post update form */}
              <div className="px-4 py-3 border-b border-gold/10">
                <div className="flex gap-3">
                  <textarea
                    value={updateContent}
                    onChange={(e) => setUpdateContent(e.target.value)}
                    placeholder="اكتب تحديثاً جديداً..."
                    rows={2}
                    className="flex-1 bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/30 resize-none"
                  />
                  <button
                    onClick={handlePostUpdate}
                    disabled={posting || !updateContent.trim()}
                    className="self-end px-4 py-2.5 bg-gold text-obsidian rounded-xl text-sm font-[family-name:var(--font-display)] font-bold disabled:opacity-50 hover:bg-gold-bright transition-colors"
                  >
                    {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>

              {/* Updates list */}
              <div className="divide-y divide-gold/5 max-h-[400px] overflow-y-auto">
                {updates.map((update) => (
                  <div key={update.id} className="px-4 py-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Clock size={10} className="text-white/30" />
                      <span className="text-[10px] text-white/40 font-[family-name:var(--font-display)]">
                        {new Date(update.created_at).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {update.users?.name && (
                        <>
                          <span className="text-white/15">·</span>
                          <span className="flex items-center gap-1 text-[10px] text-white/40">
                            <User size={9} />
                            {update.users.name}
                          </span>
                        </>
                      )}
                    </div>
                    <div
                      className="text-[13px] font-[family-name:var(--font-display)] text-white/80 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: update.content }}
                    />
                  </div>
                ))}
                {updates.length === 0 && (
                  <div className="px-4 py-8 text-center text-white/30 text-sm font-[family-name:var(--font-display)]">
                    لا توجد تحديثات بعد — اكتب أول تحديث أعلاه
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="px-4 py-12 text-center text-white/30 text-sm font-[family-name:var(--font-display)]">
              اختر بثاً مباشراً من القائمة لعرض التحديثات
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
