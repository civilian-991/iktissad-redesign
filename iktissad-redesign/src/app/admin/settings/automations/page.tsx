'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  Zap,
  ChevronUp,
  Loader2,
  Settings2,
  Send,
  Mail,
  AlertTriangle,
  Star,
  Bell,
} from 'lucide-react';
import type { AutomationRule } from '@/types';
import { getAutomations, updateAutomation } from '@/lib/api-client';

const ACTION_ICONS: Record<string, React.ElementType> = {
  post_telegram: Send,
  send_welcome_email: Mail,
  notify_admin: AlertTriangle,
  add_to_featured: Star,
  notify_editor: Bell,
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const json = await getAutomations();
      setRules(json.data ?? []);
    } catch {
      toast.error('تعذر تحميل قواعد الأتمتة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const handleToggle = async (rule: AutomationRule) => {
    setTogglingId(rule.id);
    try {
      await updateAutomation(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
      toast.success(rule.enabled ? 'تم تعطيل القاعدة' : 'تم تفعيل القاعدة');
    } catch {
      toast.error('تعذر تحديث الحالة');
    } finally {
      setTogglingId(null);
    }
  };

  const handleExpand = (rule: AutomationRule) => {
    if (expandedId === rule.id) {
      setExpandedId(null);
    } else {
      setExpandedId(rule.id);
      // Populate editing config with current values (stringify non-string values)
      const configStrings: Record<string, string> = {};
      for (const [k, v] of Object.entries(rule.config)) {
        configStrings[k] = String(v);
      }
      setEditingConfig(configStrings);
    }
  };

  const handleSaveConfig = async (rule: AutomationRule) => {
    setSavingId(rule.id);
    try {
      // Parse config values back to appropriate types
      const parsedConfig: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(editingConfig)) {
        // Try parsing numbers/booleans
        if (v === 'true') parsedConfig[k] = true;
        else if (v === 'false') parsedConfig[k] = false;
        else if (!isNaN(Number(v)) && v !== '') parsedConfig[k] = Number(v);
        else parsedConfig[k] = v;
      }

      await updateAutomation(rule.id, { config: parsedConfig });
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, config: parsedConfig } : r));
      toast.success('تم حفظ الإعدادات');
      setExpandedId(null);
    } catch {
      toast.error('تعذر حفظ الإعدادات');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
          قواعد الأتمتة
        </h1>
        <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
          تفعيل إجراءات تلقائية عند حدوث أحداث في النظام
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gold" />
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const ActionIcon = ACTION_ICONS[rule.actionType] ?? Zap;
            const isExpanded = expandedId === rule.id;

            return (
              <motion.div
                key={rule.id}
                layout
                className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden"
              >
                <div className="flex items-center gap-4 p-5">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${rule.enabled ? 'bg-gold/10' : 'bg-white/5'}`}>
                    <ActionIcon size={18} className={rule.enabled ? 'text-gold' : 'text-white/30'} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">
                        {rule.name}
                      </p>
                      {rule.enabled && (
                        <span className="px-2 py-0.5 bg-emerald-400/10 text-emerald-400 text-xs rounded-full font-[family-name:var(--font-display)]">
                          مفعّل
                        </span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
                      {rule.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 bg-blue-400/10 text-blue-300 text-xs rounded-lg font-mono">
                        {rule.triggerEvent}
                      </span>
                      <span className="text-white/20 text-xs">→</span>
                      <span className="px-2 py-0.5 bg-purple-400/10 text-purple-300 text-xs rounded-lg font-mono">
                        {rule.actionType}
                      </span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    {/* Settings expand */}
                    <button
                      onClick={() => handleExpand(rule)}
                      title="إعدادات"
                      className="p-2 text-white/40 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <Settings2 size={16} />}
                    </button>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(rule)}
                      disabled={togglingId === rule.id}
                      className={`w-11 h-6 rounded-full transition-all relative disabled:opacity-50 ${rule.enabled ? 'bg-gold' : 'bg-white/10'}`}
                    >
                      {togglingId === rule.id ? (
                        <Loader2 size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                      ) : (
                        <motion.div
                          animate={{ x: rule.enabled ? 22 : 2 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full"
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* Config Panel */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-t border-gold/10 p-5 space-y-4"
                  >
                    <h3 className="text-white/70 text-xs font-[family-name:var(--font-display)] font-semibold uppercase tracking-wider">
                      إعدادات الإجراء
                    </h3>
                    {Object.entries(editingConfig).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-white/50 text-xs font-mono mb-1.5">{key}</label>
                        <input
                          value={value}
                          onChange={(e) => setEditingConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                          dir="ltr"
                          className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-mono text-sm focus:outline-none focus:border-gold/30 transition-colors"
                        />
                      </div>
                    ))}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => handleSaveConfig(rule)}
                        disabled={savingId === rule.id}
                        className="flex items-center gap-2 px-4 py-2 bg-gold text-ink rounded-xl font-[family-name:var(--font-display)] text-sm font-semibold hover:shadow-gold transition-all disabled:opacity-50"
                      >
                        {savingId === rule.id && <Loader2 size={14} className="animate-spin" />}
                        حفظ
                      </button>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="px-4 py-2 bg-white/10 text-white rounded-xl font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <div className="p-4 bg-gold/5 border border-gold/10 rounded-xl">
        <p className="text-gold/70 text-sm font-[family-name:var(--font-display)]">
          💡 تعمل قواعد الأتمتة تلقائياً عند وقوع الأحداث المحددة. يمكنك تكوين كل قاعدة بشكل مستقل.
        </p>
      </div>
    </div>
  );
}
