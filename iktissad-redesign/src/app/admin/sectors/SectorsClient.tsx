'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import { Plus, Edit, Trash2, Briefcase, FileText, HelpCircle } from 'lucide-react';
import {
  swrFetcher,
  sectorsKey,
  createSector,
  deleteSector,
} from '@/lib/api-client';
import type { ApiResponse, Sector } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { Button, ConfirmModal, Modal, Input } from '@/components/ui';
import { iconSizes } from '@/lib/design-tokens';

interface FormState {
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  descriptionEn: string;
  icon: string;
  color: string;
}

const emptyForm: FormState = {
  name: '',
  nameEn: '',
  slug: '',
  description: '',
  descriptionEn: '',
  icon: '',
  color: '#D4AF37',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lookupLucideIcon(name?: string): any {
  if (!name) return null;
  const key = name.trim();
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = LucideIcons as unknown as Record<string, any>;
  return map[key] ?? null;
}

export function IconPreview({ name, color, size = 18 }: { name?: string; color?: string; size?: number }) {
  const Icon = lookupLucideIcon(name);
  if (!Icon) {
    return <HelpCircle size={size} className="text-white/30" />;
  }
  return <Icon size={size} style={color ? { color } : undefined} />;
}

export default function SectorsClient() {
  const { t } = useTranslation();
  const { data, isLoading, mutate } = useSWR<ApiResponse<Sector[]>>(
    sectorsKey(),
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Sector | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sectors = data?.data ?? [];

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error(t('admin.sectors.name'));
      return;
    }
    setSaving(true);
    try {
      await createSector({
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || undefined,
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
        descriptionEn: form.descriptionEn.trim() || undefined,
        icon: form.icon.trim() || undefined,
        color: form.color.trim() || undefined,
      });
      toast.success(t('admin.sectors.createSuccess'));
      setForm(emptyForm);
      setCreateOpen(false);
      mutate();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.sectors.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteSector(confirmDelete.slug);
      toast.success(t('admin.sectors.deleteSuccess'));
      setConfirmDelete(null);
      mutate();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.sectors.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.sectors.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {t('admin.sectors.description')}
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setCreateOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/90 transition-colors"
        >
          <Plus size={iconSizes.md} />
          {t('admin.sectors.addNew')}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-midnight/50 border border-gold/10 animate-pulse" />
          ))}
        </div>
      ) : sectors.length === 0 ? (
        <div className="text-center py-20">
          <Briefcase size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/40 font-[family-name:var(--font-display)]">
            {t('admin.sectors.description')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectors.map((sector) => (
            <div
              key={sector.slug}
              className="group bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5 hover:border-gold/25 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: sector.color ? `${sector.color}1F` : 'rgba(212, 175, 55, 0.15)',
                    }}
                  >
                    <IconPreview name={sector.icon} color={sector.color ?? '#D4AF37'} size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-[family-name:var(--font-display)] font-semibold text-base truncate">
                      {sector.name}
                    </h3>
                    {sector.nameEn && (
                      <p className="text-white/40 text-xs font-[family-name:var(--font-display)] truncate">
                        {sector.nameEn}
                      </p>
                    )}
                    <p className="text-white/30 text-xs font-mono mt-1 truncate" dir="ltr">
                      /{sector.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Link
                    href={`/admin/sectors/${encodeURIComponent(sector.slug)}`}
                    className="p-1.5 text-white/40 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                    title={t('admin.sectors.edit')}
                  >
                    <Edit size={14} />
                  </Link>
                  <button
                    onClick={() => setConfirmDelete(sector)}
                    className="p-1.5 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                    title={t('admin.sectors.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {sector.description && (
                <p className="text-white/60 text-sm font-[family-name:var(--font-display)] line-clamp-2 mb-3">
                  {sector.description}
                </p>
              )}

              <div className="flex items-center gap-1 text-white/40 text-xs font-[family-name:var(--font-display)] pt-2 border-t border-gold/5">
                <FileText size={11} />
                <span>{sector.articleCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('admin.sectors.addNew')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              {t('admin.sectors.cancel')}
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={saving}>
              {t('admin.sectors.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
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
            placeholder="auto"
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

          {/* Icon picker */}
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

          {/* Color picker */}
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
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
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
