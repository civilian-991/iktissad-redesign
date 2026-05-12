'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, UserPlus, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import type { AdminUser, ApiResponse } from '@/types';

interface Props {
  onClose: () => void;
  onCreated: (author: AdminUser) => void;
}

export default function AddAuthorModal({ onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', handler);
    nameInputRef.current?.focus();
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, saving]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users/contributors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          email: email.trim() || undefined,
          avatar: avatar.trim() || undefined,
        }),
      });
      const json: ApiResponse<AdminUser> = await res.json();
      if (!res.ok || !json.data) {
        toast.error(json.error || t('admin.articles.editor.addAuthorModal.error'));
        return;
      }
      toast.success(t('admin.articles.editor.addAuthorModal.success'));
      onCreated(json.data);
      onClose();
    } catch {
      toast.error(t('admin.articles.editor.addAuthorModal.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current && !saving) onClose(); }}
    >
      <div
        className="bg-midnight border border-gold/15 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gold/10">
          <div className="flex items-center gap-2">
            <UserPlus size={iconSizes.md} className="text-gold/60" />
            <h2 className="text-white font-[family-name:var(--font-display)] font-bold text-base">
              {t('admin.articles.editor.addAuthorModal.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40"
            aria-label="close"
          >
            <X size={iconSizes.md} />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="p-5 space-y-4"
        >
          <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">
            {t('admin.articles.editor.addAuthorModal.description')}
          </p>

          <div>
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
              {t('admin.articles.editor.addAuthorModal.nameLabel')}
              <span className="text-gold/80 ms-1">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin.articles.editor.addAuthorModal.namePlaceholder')}
              required
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
              {t('admin.articles.editor.addAuthorModal.emailLabel')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('admin.articles.editor.addAuthorModal.emailPlaceholder')}
              dir="ltr"
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
              {t('admin.articles.editor.addAuthorModal.avatarLabel')}
            </label>
            <input
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
              dir="ltr"
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-xl text-sm font-[family-name:var(--font-display)] transition-colors disabled:opacity-40"
            >
              {t('admin.articles.editor.addAuthorModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-obsidian hover:bg-gold/90 rounded-xl text-sm font-[family-name:var(--font-display)] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t('admin.articles.editor.addAuthorModal.creating')}
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  {t('admin.articles.editor.addAuthorModal.create')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
