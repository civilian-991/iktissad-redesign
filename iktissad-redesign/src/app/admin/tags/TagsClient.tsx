'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Tag as TagIcon, FileText, Search } from 'lucide-react';
import {
  swrFetcher,
  tagsKey,
  createTag,
  updateTag,
  deleteTag,
} from '@/lib/api-client';
import type { ApiResponse, Tag } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { Button, ConfirmModal, Modal, Input } from '@/components/ui';
import { iconSizes } from '@/lib/design-tokens';

interface FormState {
  name: string;
  nameEn: string;
}

const emptyForm: FormState = { name: '', nameEn: '' };

export default function TagsClient() {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(handle);
  }, [search]);

  const { data, isLoading, mutate } = useSWR<ApiResponse<Tag[]>>(
    tagsKey(debounced, 100),
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const tags = data?.data ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<Tag | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error(t('admin.tags.name'));
      return;
    }
    setSaving(true);
    try {
      await createTag({
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || undefined,
      });
      toast.success(t('admin.tags.createSuccess'));
      setForm(emptyForm);
      setCreateOpen(false);
      mutate();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.tags.createError'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (tag: Tag) => {
    setEditTarget(tag);
    setEditForm({ name: tag.name, nameEn: tag.nameEn });
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    if (!editForm.name.trim()) {
      toast.error(t('admin.tags.name'));
      return;
    }
    setEditSaving(true);
    try {
      await updateTag(editTarget.id, {
        name: editForm.name.trim(),
        nameEn: editForm.nameEn.trim(),
      });
      toast.success(t('admin.tags.updateSuccess'));
      setEditTarget(null);
      mutate();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.tags.deleteError'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteTag(confirmDelete.id);
      toast.success(t('admin.tags.deleteSuccess'));
      setConfirmDelete(null);
      mutate();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.tags.deleteError'));
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
            {t('admin.tags.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {t('admin.tags.description')}
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setCreateOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/90 transition-colors"
        >
          <Plus size={iconSizes.md} />
          {t('admin.tags.addNew')}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute top-1/2 -translate-y-1/2 start-3 text-white/30 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.tags.searchPlaceholder')}
          className="w-full bg-midnight/50 border border-gold/10 rounded-xl py-2.5 ps-10 pe-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-midnight/50 border border-gold/10 animate-pulse" />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-20">
          <TagIcon size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/40 font-[family-name:var(--font-display)]">
            {t('admin.tags.empty')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="group bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5 hover:border-gold/25 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-[family-name:var(--font-display)] font-semibold text-base truncate">
                    {tag.name}
                  </h3>
                  {tag.nameEn && (
                    <p className="text-white/40 text-xs font-[family-name:var(--font-display)] truncate" dir="ltr">
                      {tag.nameEn}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => openEdit(tag)}
                    className="p-1.5 text-white/40 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                    title={t('admin.tags.edit')}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(tag)}
                    className="p-1.5 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                    title={t('admin.tags.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 text-white/40 text-xs font-[family-name:var(--font-display)] pt-2 border-t border-gold/5">
                <FileText size={11} />
                <span>{tag.articleCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('admin.tags.addNew')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              {t('admin.tags.cancel')}
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={saving}>
              {t('admin.tags.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('admin.tags.name')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label={t('admin.tags.nameEn')}
            value={form.nameEn}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
          />
        </div>
      </Modal>

      {/* Edit / rename modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={t('admin.tags.renameTitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)} disabled={editSaving}>
              {t('admin.tags.cancel')}
            </Button>
            <Button variant="primary" onClick={handleEditSave} loading={editSaving}>
              {t('admin.tags.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">
            {t('admin.tags.renameHint')}
          </p>
          <Input
            label={t('admin.tags.name')}
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />
          <Input
            label={t('admin.tags.nameEn')}
            value={editForm.nameEn}
            onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
          />
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={t('admin.tags.confirmDeleteTitle')}
        message={t('admin.tags.confirmDeleteMessage')}
        variant="danger"
        confirmText={t('admin.tags.delete')}
        cancelText={t('admin.tags.cancel')}
        loading={deleting}
      />
    </div>
  );
}
