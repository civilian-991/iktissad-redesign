'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Loader2, Save } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { csrfJsonHeaders } from '@/lib/csrf-client';
import { DEFAIYA_SETTING_KEY, parseDefaiyaLink, type DefaiyaPromoSetting } from '@/lib/defaiya';

/**
 * Monthly Al Defaiya banner: paste the new issue's defaiya.com link and the
 * homepage magazine section shows its cover, linking there.
 */
export default function DefaiyaPromoCard() {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        const value = json?.data?.[DEFAIYA_SETTING_KEY] as DefaiyaPromoSetting | undefined;
        if (value) {
          setUrl(value.url ?? '');
          setEnabled(value.enabled ?? true);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const promo = parseDefaiyaLink(url);
  const invalid = url.trim() !== '' && !promo;

  const save = async () => {
    if (enabled && !promo) {
      toast.error(t('admin.magazines.defaiya.invalidLink'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: await csrfJsonHeaders(),
        body: JSON.stringify({ key: DEFAIYA_SETTING_KEY, value: { url: url.trim(), enabled } }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? t('admin.magazines.defaiya.saveError'));
      }
      toast.success(t('admin.magazines.defaiya.saved'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('admin.magazines.defaiya.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Cover preview */}
        <div className="w-24 h-32 shrink-0 rounded-lg overflow-hidden bg-white/5 border border-gold/10 flex items-center justify-center">
          {promo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={promo.cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white/30 text-xs text-center px-2">{t('admin.magazines.defaiya.noCover')}</span>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                {t('admin.magazines.defaiya.title')}
              </h2>
              <p className="text-white/50 text-sm">{t('admin.magazines.defaiya.description')}</p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              title={t('admin.magazines.defaiya.show')}
              className={`relative w-12 h-6 shrink-0 rounded-full transition-colors ${enabled ? 'bg-gold' : 'bg-white/10'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              dir="ltr"
              value={url}
              disabled={!loaded}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.defaiya.com/issues/defaiya/DR0161/browse"
              className={`flex-1 bg-white/5 border rounded-xl py-2.5 px-4 text-white text-sm placeholder:text-white/30 focus:outline-none transition-colors ${
                invalid ? 'border-loss/60 focus:border-loss' : 'border-gold/10 focus:border-gold/30'
              }`}
            />
            <button
              onClick={save}
              disabled={saving || !loaded}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold text-ink font-[family-name:var(--font-display)] font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {t('admin.magazines.defaiya.save')}
            </button>
          </div>

          {invalid ? (
            <p className="text-loss text-xs">{t('admin.magazines.defaiya.invalidLink')}</p>
          ) : promo ? (
            <a
              href={promo.url}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-gold text-xs hover:underline"
            >
              {t('admin.magazines.defaiya.issue')} {promo.issueCode}
              <ExternalLink size={12} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
