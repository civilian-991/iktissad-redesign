'use client';

/**
 * MCP Server Configuration UI
 *
 * Shows the MCP endpoint URL, available tools, API key selector,
 * and a copy-to-clipboard snippet for claude mcp add.
 * Arabic RTL layout following the admin design system.
 */

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Cpu,
  Copy,
  Check,
  Key,
  Terminal,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { MCP_TOOLS } from '@/lib/mcp/tools';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  created_at: string;
}

interface MCPClientProps {
  apiKeys: ApiKeyRow[];
}

// ── Copy-to-clipboard helper ──────────────────────────────────────────────────

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      toast.success('تم النسخ إلى الحافظة');
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    });
  }

  return { copy, copiedKey };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MCPClient({ apiKeys }: MCPClientProps) {
  const { copy, copiedKey } = useCopy();
  const [selectedKeyId, setSelectedKeyId] = useState<string>(apiKeys[0]?.id ?? '');
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId);

  // Derive the public origin; falls back to a placeholder in SSR
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://your-domain.com';

  const mcpEndpoint = `${origin}/api/mcp`;

  const claudeSnippet =
    `claude mcp add --transport http iktissad ${mcpEndpoint} \\\n` +
    `  --header "Authorization: Bearer YOUR_API_KEY"`;

  const curlSnippet =
    `curl -X POST ${mcpEndpoint} \\\n` +
    `  -H "Content-Type: application/json" \\\n` +
    `  -H "Authorization: Bearer YOUR_API_KEY" \\\n` +
    `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
          <Cpu size={20} className="text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
            خادم MCP
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            اجعل وكلاء الذكاء الاصطناعي (Claude، Cursor...) يقرؤون محتوى إقتصاد مباشرةً
          </p>
        </div>
      </div>

      {/* Endpoint URL Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold flex items-center gap-2">
          <Terminal size={16} className="text-gold" />
          عنوان الخادم (Endpoint)
        </h2>

        <div className="flex items-center gap-3 bg-white/5 border border-gold/10 rounded-xl px-4 py-3">
          <code className="flex-1 text-gold font-mono text-sm break-all">
            {mcpEndpoint}
          </code>
          <button
            onClick={() => copy(mcpEndpoint, 'endpoint')}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0"
            title="نسخ الرابط"
          >
            {copiedKey === 'endpoint' ? (
              <Check size={16} className="text-gold" />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gold/5 border border-gold/20 rounded-xl">
          <span className="text-gold text-sm mt-0.5">ℹ</span>
          <p className="text-white/60 text-sm font-[family-name:var(--font-display)]">
            البروتوكول: <span className="text-white">MCP JSON-RPC 2.0 عبر HTTP POST</span>.
            يتطلب كل طلب رأس{' '}
            <code className="text-gold bg-white/5 px-1 rounded">Authorization: Bearer &lt;مفتاح_API&gt;</code>.
          </p>
        </div>
      </motion.div>

      {/* API Key Selector */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold flex items-center gap-2">
          <Key size={16} className="text-gold" />
          مفتاح API المستخدم
        </h2>

        {apiKeys.length === 0 ? (
          <div className="p-4 bg-white/5 border border-gold/10 rounded-xl text-white/50 text-sm font-[family-name:var(--font-display)]">
            لا توجد مفاتيح API نشطة. أنشئ مفتاحاً من صفحة{' '}
            <Link href="/admin/settings" className="text-gold hover:underline">الإعدادات → API</Link>.
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 transition-colors"
            >
              {apiKeys.map((k) => (
                <option key={k.id} value={k.id} className="bg-midnight">
                  {k.name} — {k.key_prefix}****
                </option>
              ))}
            </select>

            {selectedKey && (
              <div className="flex flex-wrap gap-2">
                {selectedKey.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="px-2 py-1 bg-gold/10 text-gold text-xs rounded-lg font-mono"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Claude Code Snippet */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold flex items-center gap-2">
          <Terminal size={16} className="text-gold" />
          الاتصال من Claude Code
        </h2>

        <p className="text-white/60 text-sm font-[family-name:var(--font-display)]">
          شغّل الأمر التالي في الطرفية لإضافة خادم IKTISSAD MCP إلى Claude Code:
        </p>

        <div className="relative">
          <pre
            className="bg-obsidian border border-gold/10 rounded-xl p-4 text-sm font-mono text-white/80 overflow-x-auto"
            dir="ltr"
          >
            {claudeSnippet}
          </pre>
          <button
            onClick={() => copy(claudeSnippet, 'claude')}
            className="absolute top-3 left-3 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
            title="نسخ الأمر"
          >
            {copiedKey === 'claude' ? (
              <Check size={16} className="text-gold" />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>

        <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
          استبدل <code className="text-gold">YOUR_API_KEY</code> بمفتاح API الفعلي (لن يظهر هنا لأسباب أمنية).
        </p>
      </motion.div>

      {/* cURL Test Snippet */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold flex items-center gap-2">
          <Terminal size={16} className="text-gold" />
          اختبار الخادم (cURL)
        </h2>

        <div className="relative">
          <pre
            className="bg-obsidian border border-gold/10 rounded-xl p-4 text-sm font-mono text-white/80 overflow-x-auto"
            dir="ltr"
          >
            {curlSnippet}
          </pre>
          <button
            onClick={() => copy(curlSnippet, 'curl')}
            className="absolute top-3 left-3 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
            title="نسخ الأمر"
          >
            {copiedKey === 'curl' ? (
              <Check size={16} className="text-gold" />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>
      </motion.div>

      {/* Available Tools */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-3"
      >
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold flex items-center gap-2">
          <Cpu size={16} className="text-gold" />
          الأدوات المتاحة ({MCP_TOOLS.length})
        </h2>

        <div className="space-y-2">
          {MCP_TOOLS.map((tool) => {
            const isOpen = expandedTool === tool.name;
            const requiredParams = tool.inputSchema.required ?? [];
            const allParams = Object.entries(tool.inputSchema.properties);

            return (
              <div
                key={tool.name}
                className="border border-gold/10 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedTool(isOpen ? null : tool.name)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 text-right">
                    <code className="text-gold text-sm font-mono">{tool.name}</code>
                    <span className="text-white/50 text-sm font-[family-name:var(--font-display)] hidden md:block">
                      — {tool.description}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-white/40 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-white/40 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gold/10 pt-3 bg-white/2">
                    <p className="text-white/70 text-sm font-[family-name:var(--font-display)]">
                      {tool.description}
                    </p>

                    {allParams.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-white/40 text-xs font-[family-name:var(--font-display)] uppercase tracking-wide">
                          المدخلات
                        </p>
                        {allParams.map(([paramName, paramSchema]) => {
                          const schema = paramSchema as Record<string, unknown>;
                          const isRequired = requiredParams.includes(paramName);
                          return (
                            <div
                              key={paramName}
                              className="flex items-start gap-3 bg-white/5 rounded-lg px-3 py-2"
                              dir="ltr"
                            >
                              <code className="text-gold text-xs font-mono shrink-0 mt-0.5">
                                {paramName}
                              </code>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-white/40 text-xs font-mono">
                                    {String(schema.type ?? 'any')}
                                  </span>
                                  {isRequired && (
                                    <span className="text-xs text-loss bg-loss/10 px-1.5 py-0.5 rounded">
                                      required
                                    </span>
                                  )}
                                </div>
                                {typeof schema.description === 'string' && (
                                  <p className="text-white/50 text-xs mt-0.5">
                                    {schema.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Integration instructions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold">
          روابط مفيدة
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              label: 'توثيق بروتوكول MCP',
              href: 'https://modelcontextprotocol.io/docs',
            },
            {
              label: 'Claude Code — إضافة خوادم MCP',
              href: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
            },
            {
              label: 'Cursor — إعداد MCP',
              href: 'https://docs.cursor.com/context/model-context-protocol',
            },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:border-gold/30 transition-all text-sm font-[family-name:var(--font-display)]"
            >
              <ExternalLink size={14} className="text-gold shrink-0" />
              {link.label}
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
