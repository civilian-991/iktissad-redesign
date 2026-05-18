'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Webhook,
  Plus,
  Trash2,
  Play,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { Webhook as WebhookType, WebhookDelivery, WebhookEventType } from '@/types';

export default function WebhooksPage() {
  const { t } = useTranslation();

  const ALL_EVENTS: { value: WebhookEventType; label: string }[] = [
    { value: 'article.published',  label: t('admin.webhooks.events.article.published') },
    { value: 'article.updated',    label: t('admin.webhooks.events.article.updated') },
    { value: 'article.review',     label: t('admin.webhooks.events.article.review') },
    { value: 'subscriber.created', label: t('admin.webhooks.events.subscriber.created') },
    { value: 'subscriber.churned', label: t('admin.webhooks.events.subscriber.churned') },
    { value: 'payment.received',   label: t('admin.webhooks.events.payment.received') },
    { value: 'payment.failed',     label: t('admin.webhooks.events.payment.failed') },
    { value: 'comment.flagged',    label: t('admin.webhooks.events.comment.flagged') },
  ];
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});
  const [loadingDeliveries, setLoadingDeliveries] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/webhooks');
      const json = await res.json();
      setWebhooks(json.data ?? []);
    } catch {
      toast.error(t('admin.common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const loadDeliveries = async (webhookId: string) => {
    if (deliveries[webhookId]) return;
    setLoadingDeliveries(webhookId);
    try {
      const res = await fetch(`/api/admin/webhooks/${webhookId}/deliveries`);
      const json = await res.json();
      setDeliveries((prev) => ({ ...prev, [webhookId]: json.data ?? [] }));
    } catch {
      toast.error(t('admin.common.error'));
    } finally {
      setLoadingDeliveries(null);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadDeliveries(id);
    }
  };

  const handleCreate = async () => {
    if (!name || !url || !secret || selectedEvents.length === 0) {
      toast.error(t('admin.webhooks.validation.fillAllFields'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, secret, events: selectedEvents }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t('admin.common.error'));
      toast.success(t('admin.webhooks.actions.created'));
      setShowForm(false);
      setName(''); setUrl(''); setSecret(''); setSelectedEvents([]);
      loadWebhooks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (wh: WebhookType) => {
    try {
      const res = await fetch(`/api/admin/webhooks/${wh.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !wh.enabled }),
      });
      if (!res.ok) throw new Error('Failed');
      setWebhooks((prev) => prev.map((w) => w.id === wh.id ? { ...w, enabled: !w.enabled } : w));
    } catch {
      toast.error(t('admin.common.error'));
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/admin/webhooks/${id}/test`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      toast.success(t('admin.webhooks.actions.testSent'));
      // Clear cached deliveries to reload
      setDeliveries((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } catch {
      toast.error(t('admin.webhooks.actions.testFailed'));
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.webhooks.validation.confirmDelete'))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success(t('admin.webhooks.actions.deleted'));
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch {
      toast.error(t('admin.common.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    setSecret(Array.from(array, (b) => b.toString(16).padStart(2, '0')).join(''));
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success(t('admin.webhooks.actions.secretCopied'));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.webhooks.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {t('admin.webhooks.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all"
        >
          <Plus size={16} />
          {t('admin.webhooks.newWebhook')}
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/20 rounded-xl p-6 space-y-5"
          >
            <h2 className="text-white font-[family-name:var(--font-display)] font-bold flex items-center gap-2">
              <Webhook size={18} className="text-gold" />
              {t('admin.webhooks.newWebhook')}
            </h2>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">{t('admin.webhooks.fields.name')}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('admin.webhooks.fields.namePlaceholder')}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">{t('admin.webhooks.fields.url')}</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..."
                  dir="ltr"
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-mono text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>
            </div>

            {/* Secret */}
            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                {t('admin.webhooks.fields.secret')}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    type={showSecret ? 'text' : 'password'}
                    placeholder="••••••••••••••••••••••••"
                    dir="ltr"
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-4 pl-20 text-white font-mono text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                  />
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button type="button" onClick={() => setShowSecret(!showSecret)} className="p-1.5 text-white/40 hover:text-white transition-colors">
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button type="button" onClick={copySecret} className="p-1.5 text-white/40 hover:text-white transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={generateSecret}
                  className="px-3 py-2 bg-white/10 text-white/70 hover:text-white hover:bg-white/20 rounded-xl font-[family-name:var(--font-display)] text-xs transition-colors whitespace-nowrap"
                >
                  {t('admin.webhooks.actions.generate')}
                </button>
              </div>
            </div>

            {/* Events */}
            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">{t('admin.webhooks.fields.events')}</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {ALL_EVENTS.map((ev) => (
                  <button
                    key={ev.value}
                    type="button"
                    onClick={() => setSelectedEvents((prev) =>
                      prev.includes(ev.value) ? prev.filter((e) => e !== ev.value) : [...prev, ev.value]
                    )}
                    className={`px-3 py-2 rounded-lg text-sm font-[family-name:var(--font-display)] transition-all border ${
                      selectedEvents.includes(ev.value)
                        ? 'bg-gold/10 border-gold text-gold'
                        : 'bg-white/5 border-gold/10 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {t('admin.webhooks.actions.create')}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-white/10 text-white font-[family-name:var(--font-display)] text-sm rounded-xl hover:bg-white/20 transition-colors"
              >
                {t('common.actions.cancel')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webhooks List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gold" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-20 text-white/40 font-[family-name:var(--font-display)]">
          <Webhook size={48} className="mx-auto mb-4 opacity-30" />
          {t('admin.webhooks.empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <motion.div
              key={wh.id}
              layout
              className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden"
            >
              {/* Row */}
              <div className="flex items-center gap-4 p-4">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${wh.enabled ? 'bg-emerald-400' : 'bg-white/20'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">{wh.name}</p>
                  <p className="text-white/40 font-mono text-xs truncate" dir="ltr">{wh.url}</p>
                </div>
                <div className="hidden md:flex flex-wrap gap-1">
                  {wh.events.slice(0, 3).map((ev) => (
                    <span key={ev} className="px-2 py-0.5 bg-gold/10 text-gold text-xs rounded-lg font-[family-name:var(--font-display)]">
                      {ALL_EVENTS.find((e) => e.value === ev)?.label ?? ev}
                    </span>
                  ))}
                  {wh.events.length > 3 && (
                    <span className="px-2 py-0.5 bg-white/10 text-white/50 text-xs rounded-lg">
                      +{wh.events.length - 3}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Toggle enabled */}
                  <button
                    onClick={() => handleToggleEnabled(wh)}
                    className={`w-10 h-5 rounded-full transition-all relative ${wh.enabled ? 'bg-gold' : 'bg-white/10'}`}
                  >
                    <motion.div
                      animate={{ x: wh.enabled ? 20 : 0 }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full"
                    />
                  </button>
                  {/* Test */}
                  <button
                    onClick={() => handleTest(wh.id)}
                    disabled={testingId === wh.id}
                    title={t('admin.webhooks.actions.testTitle')}
                    className="p-2 text-white/40 hover:text-gold transition-colors disabled:opacity-50"
                  >
                    {testingId === wh.id ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(wh.id)}
                    disabled={deletingId === wh.id}
                    className="p-2 text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deletingId === wh.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                  {/* Expand deliveries */}
                  <button
                    onClick={() => toggleExpand(wh.id)}
                    className="p-2 text-white/40 hover:text-white transition-colors"
                  >
                    {expandedId === wh.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Deliveries Log */}
              <AnimatePresence>
                {expandedId === wh.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-gold/10"
                  >
                    <div className="p-4">
                      <h3 className="text-white/70 text-xs font-[family-name:var(--font-display)] mb-3">
                        {t('admin.webhooks.actions.deliveries')}
                      </h3>
                      {loadingDeliveries === wh.id ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 size={20} className="animate-spin text-gold" />
                        </div>
                      ) : (deliveries[wh.id] ?? []).length === 0 ? (
                        <p className="text-white/30 text-sm text-center py-4 font-[family-name:var(--font-display)]">
                          {t('admin.webhooks.noDeliveries')}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {(deliveries[wh.id] ?? []).map((d) => (
                            <div key={d.id} className="flex items-center gap-3 text-sm">
                              {d.success ? (
                                <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                              ) : (
                                <XCircle size={14} className="text-red-400 flex-shrink-0" />
                              )}
                              <span className="font-mono text-white/50 text-xs">{d.event}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${d.responseStatus && d.responseStatus < 300 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                                {d.responseStatus ?? 'ERR'}
                              </span>
                              <span className="text-white/30 text-xs mr-auto">
                                {new Date(d.deliveredAt).toLocaleString('ar-SA')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
