'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowRight, Trash2 } from 'lucide-react';
import {
  swrFetcher,
  updateSection,
  deleteSection,
} from '@/lib/api-client';
import type { ApiResponse, Section } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { Button, ConfirmModal, Input } from '@/components/ui';

interface FormState {
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  descriptionEn: string;
}

export default function SectionEditClient({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading } = useSWR<ApiResponse<Section & { articles: unknown[] }>>(
    `/api/sections/${encodeURIComponent(slug)}?pageSize=1`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const section = data?.data;
    if (section && !form) {
      setForm({
        name: section.name ?? '',
        nameEn: section.nameEn ?? '',
        slug: section.slug ?? '',
        description: section.description ?? '',
        descriptionEn: section.descriptionEn ?? '',
      });
    }
  }, [data, form]);

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error(t('admin.sections.name'));
      return;
    }
    setSaving(true);
    try {
      const res = await updateSection(slug, {
        name: form.name.trim(),
        nameEn: form.nameEn.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim(),
        descriptionEn: form.descriptionEn.trim(),
      });
      toast.success(t('admin.sections.updateSuccess'));
      // If slug changed, navigate to the new URL
      const newSlug = res.data?.slug ?? slug;
      if (newSlug !== slug) {
        router.push(`/admin/sections/${encodeURIComponent(newSlug)}`);
      }
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.sections.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSection(slug);
      toast.success(t('admin.sections.deleteSuccess'));
      router.push('/admin/sections');
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.sections.deleteError'));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (isLoading || !form) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 bg-midnight/50 rounded animate-pulse" />
        <div className="h-64 bg-midnight/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/admin/sections')}
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm font-[family-name:var(--font-display)] mb-2 transition-colors"
          >
            <ArrowRight size={14} />
            {t('admin.sections.title')}
          </button>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
            {t('admin.sections.edit')}
          </h1>
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-2 px-4 py-2 bg-loss/10 border border-loss/20 text-loss rounded-xl font-[family-name:var(--font-display)] text-sm hover:bg-loss/20 transition-colors"
        >
          <Trash2 size={14} />
          {t('admin.sections.delete')}
        </button>
      </div>

      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4">
        <Input
          label={t('admin.sections.name')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label={t('admin.sections.nameEn')}
          value={form.nameEn}
          onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
        />
        <Input
          label={t('admin.sections.slug')}
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
        <Input
          label={t('admin.sections.descriptionAr')}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Input
          label={t('admin.sections.descriptionEnLabel')}
          value={form.descriptionEn}
          onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
        />

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gold/10">
          <Button variant="ghost" onClick={() => router.push('/admin/sections')} disabled={saving}>
            {t('admin.sections.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {t('admin.sections.save')}
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('admin.sections.confirmDeleteTitle')}
        message={t('admin.sections.confirmDeleteMessage')}
        variant="danger"
        confirmText={t('admin.sections.delete')}
        cancelText={t('admin.sections.cancel')}
        loading={deleting}
      />
    </div>
  );
}
