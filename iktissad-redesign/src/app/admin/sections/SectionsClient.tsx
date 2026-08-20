'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Tags, FileText } from 'lucide-react';
import {
  swrFetcher,
  sectionsKey,
  createSection,
  deleteSection,
} from '@/lib/api-client';
import type { ApiResponse, Section } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { Button, ConfirmModal, Modal, Input } from '@/components/ui';
import { iconSizes } from '@/lib/design-tokens';

interface FormState {
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  descriptionEn: string;
}

const emptyForm: FormState = {
  name: '',
  nameEn: '',
  slug: '',
  description: '',
  descriptionEn: '',
};

export default function SectionsClient() {
  const { t } = useTranslation();
  const { data, isLoading, mutate } = useSWR<ApiResponse<Section[]>>(
    sectionsKey(),
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sections = data?.data ?? [];

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error(t('admin.sections.name'));
      return;
    }
    setSaving(true);
    try {
      await createSection({
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || undefined,
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
        descriptionEn: form.descriptionEn.trim() || undefined,
      });
      toast.success(t('admin.sections.createSuccess'));
      setForm(emptyForm);
      setCreateOpen(false);
      mutate();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.sections.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteSection(confirmDelete.slug);
      toast.success(t('admin.sections.deleteSuccess'));
      setConfirmDelete(null);
      mutate();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.sections.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.sections.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {t('admin.sections.description')}
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setCreateOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold text-ink rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/90 transition-colors"
        >
          <Plus size={iconSizes.md} />
          {t('admin.sections.addNew')}
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-midnight/50 border border-gold/10 animate-pulse" />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-20">
          <Tags size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/40 font-[family-name:var(--font-display)]">
            {t('admin.sections.description')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => (
            <div
              key={section.slug}
              className="group bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5 hover:border-gold/25 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-[family-name:var(--font-display)] font-semibold text-base truncate">
                    {section.name}
                  </h3>
                  {section.nameEn && (
                    <p className="text-white/40 text-xs font-[family-name:var(--font-display)] truncate">
                      {section.nameEn}
                    </p>
                  )}
                  <p className="text-white/30 text-xs font-mono mt-1 truncate" dir="ltr">
                    /{section.slug}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Link
                    href={`/admin/sections/${encodeURIComponent(section.slug)}`}
                    className="p-1.5 text-white/40 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                    title={t('admin.sections.edit')}
                  >
                    <Edit size={14} />
                  </Link>
                  <button
                    onClick={() => setConfirmDelete(section)}
                    className="p-1.5 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                    title={t('admin.sections.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {section.description && (
                <p className="text-white/60 text-sm font-[family-name:var(--font-display)] line-clamp-2 mb-3">
                  {section.description}
                </p>
              )}

              <div className="flex items-center gap-1 text-white/40 text-xs font-[family-name:var(--font-display)] pt-2 border-t border-gold/5">
                <FileText size={11} />
                <span>{section.articleCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('admin.sections.addNew')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              {t('admin.sections.cancel')}
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={saving}>
              {t('admin.sections.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
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
            placeholder="auto"
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
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
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
