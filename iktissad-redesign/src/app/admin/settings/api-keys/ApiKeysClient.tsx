'use client';

/**
 * API Keys Management UI
 * Phase 10.2 — Public REST API
 *
 * - Lists all API keys (prefix shown, raw key never stored)
 * - Create new key → one-time modal showing full key
 * - Click row → usage stats panel (request counts, top endpoints)
 * - Toggle active / delete
 * - API documentation section with curl examples
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
  Activity,
  Clock,
  AlertTriangle,
  Terminal,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import type { ApiKey, ApiKeyScope, ApiKeyUsageStats } from '@/types';
import {
  getApiKeys,
  getApiKeyUsage,
  createApiKey,
  updateApiKey,
  deleteApiKey,
} from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_SCOPES: { value: ApiKeyScope; label: string }[] = [
  { value: 'read:articles',  label: 'قراءة المقالات' },
  { value: 'read:sections',  label: 'قراءة الأقسام' },
  { value: 'read:sectors',   label: 'قراءة القطاعات' },
  { value: 'read:countries', label: 'قراءة الدول' },
  { value: 'read:series',    label: 'قراءة الملفات' },
];

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://iktissad.com';

// ---------------------------------------------------------------------------
// One-time key reveal modal
// ---------------------------------------------------------------------------

interface RevealModalProps {
  rawKey: string;
  keyName: string;
  onClose: () => void;
}

function RevealModal({ rawKey, keyName, onClose }: RevealModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 24 }}
        className="bg-midnight border border-gold/20 rounded-2xl p-8 w-full max-w-lg shadow-elevated"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
            <Key size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
              مفتاح API جديد
            </h2>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">{keyName}</p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-5">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300 text-sm font-[family-name:var(--font-display)] leading-relaxed">
            احفظ هذا المفتاح — لن يظهر مجددًا. يتم تخزين نسخة مشفرة فقط في قاعدة البيانات.
          </p>
        </div>

        {/* Key display */}
        <div className="bg-obsidian border border-gold/10 rounded-xl p-4 mb-5 flex items-center gap-3">
          <code className="flex-1 text-gold font-mono text-sm break-all leading-relaxed" dir="ltr">
            {rawKey}
          </code>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-2 rounded-lg bg-gold/10 hover:bg-gold/20 transition-colors"
          >
            {copied
              ? <CheckCircle2 size={16} className="text-emerald-400" />
              : <Copy size={16} className="text-gold" />
            }
          </button>
        </div>

        {/* Usage example */}
        <div className="bg-obsidian border border-white/5 rounded-xl p-4 mb-6">
          <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-2">مثال على الاستخدام</p>
          <code className="text-white/70 font-mono text-xs" dir="ltr">
            curl -H &quot;Authorization: Bearer {rawKey}&quot; \<br />
            &nbsp;&nbsp;{BASE_URL}/api/v1/articles
          </code>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-bold rounded-xl hover:shadow-gold transition-all"
        >
          حسنًا، حفظت المفتاح
        </button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Usage stats panel
// ---------------------------------------------------------------------------

interface UsagePanelProps {
  keyId: string;
  keyName: string;
}

function UsagePanel({ keyId, keyName }: UsagePanelProps) {
  const [stats, setStats] = useState<ApiKeyUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await getApiKeyUsage(keyId);
      setStats(json.data ?? null);
    } catch {
      toast.error('تعذر تحميل إحصاءات الاستخدام');
    } finally {
      setLoading(false);
    }
  }, [keyId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-5 border-t border-gold/10 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-white/80 text-sm font-[family-name:var(--font-display)] font-semibold flex items-center gap-2">
          <Activity size={14} className="text-gold" />
          إحصاءات: {keyName}
        </h3>
        <button onClick={load} className="text-white/40 hover:text-white transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'اليوم',          value: stats.requestsToday,  icon: Clock },
          { label: '7 أيام',         value: stats.requests7Days,  icon: Activity },
          { label: '30 يومًا',       value: stats.requests30Days, icon: Activity },
          { label: 'الإجمالي',       value: stats.totalRequests,  icon: Key },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
            <Icon size={14} className="text-gold mx-auto mb-1" />
            <p className="text-white font-bold text-xl font-[family-name:var(--font-accent)]">
              {value.toLocaleString('ar-SA')}
            </p>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <XCircle size={14} className={stats.errorRate > 10 ? 'text-red-400' : 'text-white/40'} />
          <span className="text-white/60 text-sm font-[family-name:var(--font-display)]">
            معدل الأخطاء: <span className={`font-bold ${stats.errorRate > 10 ? 'text-red-400' : 'text-emerald-400'}`}>{stats.errorRate}%</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-white/40" />
          <span className="text-white/60 text-sm font-[family-name:var(--font-display)]">
            متوسط الاستجابة: <span className="font-bold text-white">{stats.avgResponseTimeMs} ms</span>
          </span>
        </div>
      </div>

      {/* Top endpoints */}
      {stats.topEndpoints.length > 0 && (
        <div>
          <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-2">أكثر نقاط النهاية استخدامًا</p>
          <div className="space-y-1.5">
            {stats.topEndpoints.slice(0, 5).map(({ endpoint, count }) => {
              const pct = stats.totalRequests > 0 ? Math.round((count / stats.totalRequests) * 100) : 0;
              return (
                <div key={endpoint} className="flex items-center gap-3">
                  <code className="text-white/60 font-mono text-xs flex-1 truncate" dir="ltr">{endpoint}</code>
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-white/40 text-xs w-8 text-left font-mono">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------

interface CreateFormProps {
  onCreated: (key: ApiKey, rawKey: string) => void;
  onCancel: () => void;
}

function CreateForm({ onCreated, onCancel }: CreateFormProps) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<ApiKeyScope[]>(['read:articles', 'read:sections']);
  const [rateLimit, setRateLimit] = useState(60);
  const [saving, setSaving] = useState(false);

  const toggleScope = (scope: ApiKeyScope) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('يرجى إدخال اسم المفتاح'); return; }
    if (scopes.length === 0) { toast.error('يرجى اختيار صلاحية واحدة على الأقل'); return; }

    setSaving(true);
    try {
      const json = await createApiKey({
        name: name.trim(),
        scopes,
        rateLimitPerMinute: rateLimit,
      });
      if (!json.data) throw new Error(json.error ?? 'حدث خطأ');
      onCreated(json.data as ApiKey, json.rawKey as string);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="bg-midnight/50 backdrop-blur-sm border border-gold/20 rounded-xl p-6 space-y-5"
    >
      <h2 className="text-white font-[family-name:var(--font-display)] font-bold flex items-center gap-2">
        <Key size={18} className="text-gold" />
        مفتاح API جديد
      </h2>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Name */}
        <div>
          <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
            الاسم <span className="text-red-400">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: تطبيق الجوال"
            className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
          />
        </div>

        {/* Rate limit */}
        <div>
          <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
            الحد الأقصى (طلب / دقيقة)
          </label>
          <input
            type="number"
            min={1}
            max={1000}
            value={rateLimit}
            onChange={(e) => setRateLimit(Math.max(1, Math.min(1000, parseInt(e.target.value, 10) || 60)))}
            className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            dir="ltr"
          />
        </div>
      </div>

      {/* Scopes */}
      <div>
        <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
          الصلاحيات <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_SCOPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleScope(value)}
              className={`px-3 py-2 rounded-lg text-sm font-[family-name:var(--font-display)] transition-all border ${
                scopes.includes(value)
                  ? 'bg-gold/10 border-gold text-gold'
                  : 'bg-white/5 border-gold/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          إنشاء المفتاح
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 bg-white/10 text-white font-[family-name:var(--font-display)] text-sm rounded-xl hover:bg-white/20 transition-colors"
        >
          إلغاء
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Scope badge helper
// ---------------------------------------------------------------------------

function ScopeBadge({ scope }: { scope: string }) {
  const label = ALL_SCOPES.find((s) => s.value === scope)?.label ?? scope;
  return (
    <span className="px-2 py-0.5 bg-gold/10 text-gold text-xs rounded-lg font-[family-name:var(--font-display)] whitespace-nowrap">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ApiKeysClient() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [revealKey, setRevealKey] = useState<{ rawKey: string; name: string } | null>(null);
  const [showDocsSection, setShowDocsSection] = useState(false);
  const [showPrefixes, setShowPrefixes] = useState<Record<string, boolean>>({});

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const json = await getApiKeys();
      setKeys(json.data ?? []);
    } catch {
      toast.error('تعذر تحميل مفاتيح API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadKeys(); }, [loadKeys]);

  const handleCreated = (key: ApiKey, rawKey: string) => {
    setKeys((prev) => [key, ...prev]);
    setShowForm(false);
    setRevealKey({ rawKey, name: key.name });
    toast.success('تم إنشاء المفتاح');
  };

  const handleToggleActive = async (key: ApiKey) => {
    setTogglingId(key.id);
    try {
      await updateApiKey(key.id, { isActive: !key.isActive });
      setKeys((prev) => prev.map((k) => k.id === key.id ? { ...k, isActive: !k.isActive } : k));
      toast.success(key.isActive ? 'تم تعطيل المفتاح' : 'تم تفعيل المفتاح');
    } catch {
      toast.error('تعذر تحديث الحالة');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل تريد حذف مفتاح "${name}" نهائياً؟`)) return;
    setDeletingId(id);
    try {
      await deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast.success('تم حذف المفتاح');
    } catch {
      toast.error('تعذر حذف المفتاح');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const toggleShowPrefix = (id: string) => {
    setShowPrefixes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* One-time reveal modal */}
      <AnimatePresence>
        {revealKey && (
          <RevealModal
            rawKey={revealKey.rawKey}
            keyName={revealKey.name}
            onClose={() => setRevealKey(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1 flex items-center gap-3">
            <Key size={22} className="text-gold" />
            مفاتيح API
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            أنشئ مفاتيح وصول للـ API العامة واقرأ المحتوى برمجيًا
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all"
        >
          <Plus size={16} />
          مفتاح API جديد
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <CreateForm
            onCreated={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Keys list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gold" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-20 text-white/40 font-[family-name:var(--font-display)]">
          <Key size={48} className="mx-auto mb-4 opacity-30" />
          <p>لا توجد مفاتيح API بعد</p>
          <p className="text-sm mt-1 text-white/30">أنشئ أول مفتاح للبدء</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <motion.div
              key={key.id}
              layout
              className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden"
            >
              {/* Key row */}
              <div className="flex items-center gap-4 p-4">
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${key.isActive ? 'bg-emerald-400' : 'bg-white/20'}`} />

                {/* Key info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">{key.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-white/40 font-mono text-xs" dir="ltr">
                      {showPrefixes[key.id] ? key.keyPrefix : `${key.keyPrefix}${'•'.repeat(24)}`}
                    </code>
                    <button
                      onClick={() => toggleShowPrefix(key.id)}
                      className="text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPrefixes[key.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <span className="text-white/20 text-xs">·</span>
                    <span className="text-white/30 text-xs font-[family-name:var(--font-display)]">
                      {key.rateLimitPerMinute} req/min
                    </span>
                  </div>
                </div>

                {/* Scopes */}
                <div className="hidden md:flex flex-wrap gap-1 max-w-xs">
                  {key.scopes.slice(0, 3).map((s) => <ScopeBadge key={s} scope={s} />)}
                  {key.scopes.length > 3 && (
                    <span className="px-2 py-0.5 bg-white/10 text-white/50 text-xs rounded-lg">
                      +{key.scopes.length - 3}
                    </span>
                  )}
                </div>

                {/* Last used */}
                <div className="hidden lg:block text-right">
                  <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">آخر استخدام</p>
                  <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleDateString('ar-SA')
                      : 'لم يُستخدم'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggleActive(key)}
                    disabled={togglingId === key.id}
                    title={key.isActive ? 'تعطيل' : 'تفعيل'}
                    className={`w-10 h-5 rounded-full transition-all relative disabled:opacity-50 ${key.isActive ? 'bg-gold' : 'bg-white/10'}`}
                  >
                    <motion.div
                      animate={{ x: key.isActive ? 20 : 0 }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full"
                    />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(key.id, key.name)}
                    disabled={deletingId === key.id}
                    className="p-2 text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deletingId === key.id
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Trash2 size={16} />
                    }
                  </button>

                  {/* Expand usage */}
                  <button
                    onClick={() => toggleExpand(key.id)}
                    className="p-2 text-white/40 hover:text-white transition-colors"
                  >
                    {expandedId === key.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Usage stats panel */}
              <AnimatePresence>
                {expandedId === key.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <UsagePanel keyId={key.id} keyName={key.name} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* API Documentation section */}
      <div className="border border-gold/10 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowDocsSection((v) => !v)}
          className="w-full flex items-center justify-between p-5 bg-midnight/30 hover:bg-midnight/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Terminal size={18} className="text-gold" />
            <span className="text-white font-[family-name:var(--font-display)] font-semibold">
              توثيق API — أمثلة سريعة
            </span>
          </div>
          {showDocsSection ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
        </button>

        <AnimatePresence>
          {showDocsSection && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 space-y-5 border-t border-gold/10">

                {/* Auth note */}
                <div className="flex items-start gap-3 bg-gold/5 border border-gold/10 rounded-xl p-4">
                  <Shield size={16} className="text-gold flex-shrink-0 mt-0.5" />
                  <p className="text-white/70 text-sm font-[family-name:var(--font-display)] leading-relaxed">
                    جميع طلبات API العامة تتطلب إرسال المفتاح في ترويسة{' '}
                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-gold font-mono text-xs" dir="ltr">Authorization: Bearer &lt;key&gt;</code>
                  </p>
                </div>

                {/* Endpoint table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-[family-name:var(--font-display)]">
                    <thead>
                      <tr className="text-white/40 border-b border-gold/10">
                        <th className="text-right py-2 pr-0 font-semibold">نقطة النهاية</th>
                        <th className="text-right py-2 font-semibold">الصلاحية المطلوبة</th>
                        <th className="text-right py-2 font-semibold">الوصف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold/5">
                      {[
                        { endpoint: 'GET /api/v1/articles',        scope: 'read:articles', desc: 'قائمة المقالات المنشورة' },
                        { endpoint: 'GET /api/v1/articles/[slug]', scope: 'read:articles', desc: 'مقال واحد بالمعرف' },
                        { endpoint: 'GET /api/v1/sections',        scope: 'read:sections', desc: 'جميع الأقسام' },
                        { endpoint: 'GET /api/v1/sectors',         scope: 'read:sectors',  desc: 'جميع القطاعات' },
                        { endpoint: 'GET /api/v1/series',          scope: 'read:series',   desc: 'الملفات الصحفية النشطة' },
                        { endpoint: 'GET /api/v1/series/[slug]',   scope: 'read:series',   desc: 'ملف صحفي مع مقالاته' },
                      ].map(({ endpoint, scope, desc }) => (
                        <tr key={endpoint} className="hover:bg-white/2">
                          <td className="py-2.5 pr-0">
                            <code className="text-gold font-mono text-xs" dir="ltr">{endpoint}</code>
                          </td>
                          <td className="py-2.5">
                            <code className="text-white/50 font-mono text-xs" dir="ltr">{scope}</code>
                          </td>
                          <td className="py-2.5 text-white/60 text-xs">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Curl examples */}
                <div className="space-y-3">
                  <p className="text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold uppercase tracking-wide">
                    أمثلة curl
                  </p>

                  {[
                    {
                      label: 'جلب أحدث المقالات',
                      code: `curl -H "Authorization: Bearer ikt_YOUR_KEY" \\\n  "${BASE_URL}/api/v1/articles?page=1&limit=10"`,
                    },
                    {
                      label: 'البحث بالعنوان',
                      code: `curl -H "Authorization: Bearer ikt_YOUR_KEY" \\\n  "${BASE_URL}/api/v1/articles?q=اقتصاد&section=markets"`,
                    },
                    {
                      label: 'جلب مقال بالمعرف',
                      code: `curl -H "Authorization: Bearer ikt_YOUR_KEY" \\\n  "${BASE_URL}/api/v1/articles/article-slug-here"`,
                    },
                  ].map(({ label, code }) => (
                    <div key={label}>
                      <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-1.5">{label}</p>
                      <div className="bg-obsidian border border-white/5 rounded-xl p-4 relative group">
                        <pre className="text-white/70 font-mono text-xs leading-relaxed overflow-x-auto" dir="ltr">{code}</pre>
                        <button
                          onClick={() => { void navigator.clipboard.writeText(code); toast.success('تم النسخ'); }}
                          className="absolute top-3 left-3 p-1.5 bg-white/5 hover:bg-white/15 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Copy size={12} className="text-white/60" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rate limit note */}
                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-white/50 text-xs font-[family-name:var(--font-display)] leading-relaxed">
                    عند تجاوز الحد الأقصى للطلبات، يُرجع الخادم{' '}
                    <code className="text-amber-400 font-mono" dir="ltr">429 Too Many Requests</code>{' '}
                    مع ترويسة{' '}
                    <code className="font-mono text-white/60" dir="ltr">Retry-After: 60</code>.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
