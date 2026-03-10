'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface LoginClientProps {
  redirectTo?: string;
}

export default function LoginClient({ redirectTo }: LoginClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      setLoading(false);
      return;
    }

    router.push(redirectTo ?? '/admin');
    router.refresh();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-obsidian px-4"
      dir="rtl"
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gold via-gold-muted to-bronze mb-4">
            <span className="text-obsidian font-[family-name:var(--font-display)] font-black text-2xl">
              إ
            </span>
          </div>
          <h1 className="text-gold font-[family-name:var(--font-display)] font-bold text-2xl">
            إقتصاد
          </h1>
          <p className="text-white/50 text-sm mt-1 font-[family-name:var(--font-display)]">
            تسجيل الدخول إلى لوحة التحكم
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-midnight border border-gold/10 rounded-2xl p-8 space-y-5 shadow-2xl"
        >
          {/* Email */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-[family-name:var(--font-display)] text-white/70"
            >
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@iktissad.com"
              dir="ltr"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gold/10 text-white placeholder:text-white/30 font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-[family-name:var(--font-display)] text-white/70"
            >
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gold/10 text-white placeholder:text-white/30 font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-red-400 text-sm font-[family-name:var(--font-display)] text-center">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gold text-obsidian font-[family-name:var(--font-display)] font-bold text-sm transition-all hover:bg-gold-muted disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
