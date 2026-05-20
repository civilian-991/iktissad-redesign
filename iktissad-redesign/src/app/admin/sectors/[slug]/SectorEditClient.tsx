'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowRight, Trash2 } from 'lucide-react';
import {
  swrFetcher,
  updateSector,
  deleteSector,
} from '@/lib/api-client';
import type { ApiResponse, Sector } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { Button, ConfirmModal, Input } from '@/components/ui';
import { IconPreview } from '../SectorsClient';

interface FormState {
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  descriptionEn: string;
  icon: string;
  color: string;
}

export default function SectorEditClient({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading } = useSWR<ApiResponse<Sector & { articles: unknown[] }>>(
    `/api/sectors/${encodeURIComponent(slug)}?pageSize=1`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const sector = data?.data;
    if (sector && !form) {
      setForm({
        name: sector.name ?? '',
        nameEn: sector.nameEn ?? '',
        slug: sector.slug ?? '',
        description: sector.description ?? '',
        descriptionEn: sector.descriptionEn ?? '',
        icon: sector.icon ?? '',
        color: sector.color ?? '#D4AF37',
      });
    }
  }, [data, form]);

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error(t('admin.sectors.name'));
      return;
    }
    setSaving(true);
    try {
      const res = await updateSector(slug, {
        name: form.name.trim(),
        nameEn: form.nameEn.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim(),
        descriptionEn: form.descriptionEn.trim(),
        icon: form.icon.trim(),
        color: form.color.trim(),
      });
      toast.success(t('admin.sectors.updateSuccess'));
      const newSlug = res.data?.slug ?? slug;
      if (newSlug !== slug) {
        router.push(`/admin/sectors/${encodeURIComponent(newSlug)}`);
      }
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.sectors.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSector(slug);
      toast.success(t('admin.sectors.deleteSuccess'));
      router.push('/admin/sectors');
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.sectors.deleteError'));
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
            onClick={() => router.push('/admin/sectors')}
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm font-[family-name:var(--font-display)] mb-2 transition-colors"
          >
            <ArrowRight size={14} />
            {t('admin.sectors.title')}
          </button>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
            {t('admin.sectors.edit')}
          </h1>
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-2 px-4 py-2 bg-loss/10 border border-loss/20 text-loss rounded-xl font-[family-name:var(--font-display)] text-sm hover:bg-loss/20 transition-colors"
        >
          <Trash2 size={14} />
          {t('admin.sectors.delete')}
        </button>
      </div>

      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4">
        <Input
          label={t('admin.sectors.name')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label={t('admin.sectors.nameEn')}
          value={form.nameEn}
          onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
        />
        <Input
          label={t('admin.sectors.slug')}
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
        <Input
          label={t('admin.sectors.descriptionAr')}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Input
          label={t('admin.sectors.descriptionEnLabel')}
          value={form.descriptionEn}
          onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
        />

        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2">
            {t('admin.sectors.icon')}
          </label>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <IconPreview name={form.icon} color={form.color} size={22} />
            </div>
            <Input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="Briefcase"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2">
            {t('admin.sectors.color')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.color || '#D4AF37'}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-12 h-12 rounded-lg border border-slate-200 cursor-pointer bg-transparent"
            />
            <Input
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="#D4AF37"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gold/10">
          <Button variant="ghost" onClick={() => router.push('/admin/sectors')} disabled={saving}>
            {t('admin.sectors.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {t('admin.sectors.save')}
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('admin.sectors.confirmDeleteTitle')}
        message={t('admin.sectors.confirmDeleteMessage')}
        variant="danger"
        confirmText={t('admin.sectors.delete')}
        cancelText={t('admin.sectors.cancel')}
        loading={deleting}
      />
    </div>
  );
}
