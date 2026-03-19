'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { MediaItem } from '@/types';

interface SemanticMediaSearchProps {
  onSelect?: (url: string, filename: string) => void;
}

export default function SemanticMediaSearch({ onSelect }: SemanticMediaSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch('/api/ai/media-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults(data.data?.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="ابحث بالوصف... مثال: اجتماع أعمال، رسم بياني، بورصة"
          className="flex-1 bg-midnight border border-gold/20 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/50 font-[family-name:var(--font-display)]"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-4 py-2.5 bg-gold/10 border border-gold/20 text-gold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          <span className="text-sm font-[family-name:var(--font-display)]">بحث ذكي</span>
        </button>
      </div>

      {searched && !loading && results.length === 0 && (
        <p className="text-white/40 text-sm text-center py-8 font-[family-name:var(--font-display)]">
          لا توجد نتائج لـ &quot;{query}&quot;
        </p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect?.(item.url, item.filename)}
              className="relative aspect-square rounded-lg overflow-hidden border border-gold/10 hover:border-gold/40 transition-colors group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.alt || item.filename}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-obsidian/0 group-hover:bg-obsidian/40 transition-colors" />
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-obsidian/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate font-[family-name:var(--font-display)]">
                  {item.alt || item.filename}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
