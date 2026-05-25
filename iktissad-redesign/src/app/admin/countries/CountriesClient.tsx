'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Globe, FileText, X } from 'lucide-react';
import {
  swrFetcher,
  countriesKey,
  createCountry,
  updateCountry,
  deleteCountry,
} from '@/lib/api-client';
import type { ApiResponse, Country } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { Button, ConfirmModal, Modal, Input, Textarea } from '@/components/ui';
import { iconSizes } from '@/lib/design-tokens';

type Region = 'gulf' | 'mashreq' | 'northafrica' | 'world';
const REGIONS: Region[] = ['gulf', 'mashreq', 'northafrica', 'world'];

/** key_indicators is a free-form map; edit it as ordered rows, serialize on save. */
interface IndicatorRow {
  key: string;
  value: string;
}

interface FormState {
  name: string;
  nameEn: string;
  slug: string;
  flag: string;
  region: Region;
  economicOverview: string;
  economicOverviewEn: string;
  indicators: IndicatorRow[];
}

const emptyForm: FormState = {
  name: '',
  nameEn: '',
  slug: '',
  flag: '',
  region: 'world',
  economicOverview: '',
  economicOverviewEn: '',
  indicators: [],
};

function formFromCountry(c: Country): FormState {
  return {
    name: c.name ?? '',
    nameEn: c.nameEn ?? '',
    slug: c.slug ?? '',
    flag: c.flag ?? '',
    region: (REGIONS.includes(c.region as Region) ? c.region : 'world') as Region,
    economicOverview: c.economicOverview ?? '',
    economicOverviewEn: c.economicOverviewEn ?? '',
    indicators: Object.entries(c.keyIndicators ?? {}).map(([key, value]) => ({
      key,
      value: String(value),
    })),
  };
}

/** Serialize indicator rows to a Record, dropping rows with an empty key. */
function indicatorsToRecord(rows: IndicatorRow[]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const { key, value } of rows) {
    const k = key.trim();
    if (!k) continue;
    const num = Number(value);
    out[k] = value.trim() !== '' && !Number.isNaN(num) ? num : value;
  }
  return out;
}

export default function CountriesClient() {
  const { t } = useTranslation();
  const { data, isLoading, mutate } = useSWR<ApiResponse<Country[]>>(
    countriesKey(),
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const [modalOpen, setModalOpen] = useState(false);
  // null = create mode; a Country = edit mode (its slug is the update target)
  const [editing, setEditing] = useState<Country | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Country | null>(null);
  const [deleting, setDeleting] = useState(false);

  const countries = data?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c: Country) => {
    setEditing(c);
    setForm(formFromCountry(c));
    setModalOpen(true);
  };

  const setIndicator = (i: number, patch: Partial<IndicatorRow>) =>
    setForm((f) => ({
      ...f,
      indicators: f.indicators.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    }));

  const addIndicator = () =>
    setForm((f) => ({ ...f, indicators: [...f.indicators, { key: '', value: '' }] }));

  const removeIndicator = (i: number) =>
    setForm((f) => ({ ...f, indicators: f.indicators.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(t('admin.countries.name'));
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      nameEn: form.nameEn.trim() || undefined,
      slug: form.slug.trim() || undefined,
      flag: form.flag.trim() || undefined,
      region: form.region,
      economicOverview: form.economicOverview.trim() || undefined,
      economicOverviewEn: form.economicOverviewEn.trim() || undefined,
      keyIndicators: indicatorsToRecord(form.indicators),
    };
    try {
      if (editing) {
        await updateCountry(editing.slug, payload);
        toast.success(t('admin.countries.updateSuccess'));
      } else {
        await createCountry(payload);
        toast.success(t('admin.countries.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      mutate();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.countries.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteCountry(confirmDelete.slug);
      toast.success(t('admin.countries.deleteSuccess'));
      setConfirmDelete(null);
      mutate();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.countries.deleteError'));
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
            {t('admin.countries.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {t('admin.countries.description')}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/90 transition-colors"
        >
          <Plus size={iconSizes.md} />
          {t('admin.countries.addNew')}
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-midnight/50 border border-gold/10 animate-pulse" />
          ))}
        </div>
      ) : countries.length === 0 ? (
        <div className="text-center py-20">
          <Globe size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/40 font-[family-name:var(--font-display)]">
            {t('admin.countries.empty')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {countries.map((country) => (
            <div
              key={country.slug}
              className="group bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5 hover:border-gold/25 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-[family-name:var(--font-display)] font-semibold text-base truncate flex items-center gap-2">
                    {country.flag && <span className="text-lg leading-none">{country.flag}</span>}
                    <span className="truncate">{country.name}</span>
                  </h3>
                  {country.nameEn && (
                    <p className="text-white/40 text-xs font-[family-name:var(--font-display)] truncate" dir="ltr">
                      {country.nameEn}
                    </p>
                  )}
                  <p className="text-white/30 text-xs font-mono mt-1 truncate" dir="ltr">
                    /{country.slug}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => openEdit(country)}
                    className="p-1.5 text-white/40 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                    title={t('admin.countries.edit')}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(country)}
                    className="p-1.5 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                    title={t('admin.countries.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gold/5">
                <span className="px-2 py-0.5 rounded-md bg-gold/10 text-gold/80 text-[10px] font-[family-name:var(--font-display)]">
                  {t(`admin.countries.region_${country.region}`)}
                </span>
                <span className="flex items-center gap-1 text-white/40 text-xs font-[family-name:var(--font-display)]">
                  <FileText size={11} />
                  {country.articleCount ?? 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('admin.countries.edit') : t('admin.countries.addNew')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              {t('admin.countries.cancel')}
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {t('admin.countries.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('admin.countries.name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label={t('admin.countries.nameEn')}
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label={t('admin.countries.slug')}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="auto"
              dir="ltr"
            />
            <Input
              label={t('admin.countries.flag')}
              value={form.flag}
              onChange={(e) => setForm({ ...form, flag: e.target.value })}
              placeholder="🇸🇦"
            />
            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-1.5">
                {t('admin.countries.region')}
              </label>
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value as Region })}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-3 text-white text-sm font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r} className="bg-midnight">
                    {t(`admin.countries.region_${r}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Textarea
            label={t('admin.countries.economicOverview')}
            value={form.economicOverview}
            onChange={(e) => setForm({ ...form, economicOverview: e.target.value })}
            rows={3}
          />
          <Textarea
            label={t('admin.countries.economicOverviewEn')}
            value={form.economicOverviewEn}
            onChange={(e) => setForm({ ...form, economicOverviewEn: e.target.value })}
            rows={3}
            dir="ltr"
          />

          {/* Key indicators editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)]">
                {t('admin.countries.keyIndicators')}
              </label>
              <button
                type="button"
                onClick={addIndicator}
                className="flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-gold/20 rounded-lg text-gold text-xs font-[family-name:var(--font-display)] hover:bg-gold/10 transition-colors"
              >
                <Plus size={12} />
                {t('admin.countries.addIndicator')}
              </button>
            </div>
            {form.indicators.length === 0 ? (
              <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">
                {t('admin.countries.noIndicators')}
              </p>
            ) : (
              <div className="space-y-2">
                {form.indicators.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={row.key}
                      onChange={(e) => setIndicator(i, { key: e.target.value })}
                      placeholder={t('admin.countries.indicatorName')}
                      className="flex-1 bg-white/5 border border-gold/10 rounded-lg py-2 px-3 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                    />
                    <input
                      value={row.value}
                      onChange={(e) => setIndicator(i, { value: e.target.value })}
                      placeholder={t('admin.countries.indicatorValue')}
                      dir="ltr"
                      className="flex-1 bg-white/5 border border-gold/10 rounded-lg py-2 px-3 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeIndicator(i)}
                      className="p-2 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors shrink-0"
                      title={t('admin.countries.delete')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={t('admin.countries.confirmDeleteTitle')}
        message={t('admin.countries.confirmDeleteMessage')}
        variant="danger"
        confirmText={t('admin.countries.delete')}
        cancelText={t('admin.countries.cancel')}
        loading={deleting}
      />
    </div>
  );
}
