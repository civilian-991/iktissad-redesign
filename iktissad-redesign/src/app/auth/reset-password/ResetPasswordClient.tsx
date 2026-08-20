'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ResetPasswordClient() {
  const { t } = useTranslation();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sets the session via the URL hash after a password reset link click.
  // We listen for the PASSWORD_RECOVERY event to confirm a valid recovery session.
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }
    if (newPassword.length < 8) {
      setError('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError('تعذر تحديث كلمة المرور. يرجى المحاولة مجدداً.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    // Redirect to account page after short delay
    setTimeout(() => {
      router.push('/account');
    }, 2000);
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
            <span className="text-ink font-[family-name:var(--font-display)] font-black text-2xl">
              إ
            </span>
          </div>
          <h1 className="text-gold font-[family-name:var(--font-display)] font-bold text-2xl">
            إقتصاد
          </h1>
          <p className="text-white/50 text-sm mt-1 font-[family-name:var(--font-display)]">
            إعادة تعيين كلمة المرور
          </p>
        </div>

        <div className="bg-midnight border border-gold/10 rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center">
                <CheckCircle className="text-green-400" size={28} />
              </div>
              <p className="text-white/80 text-sm font-[family-name:var(--font-display)] leading-relaxed">
                تم تحديث كلمة المرور بنجاح. سيتم تحويلك الآن...
              </p>
            </div>
          ) : !sessionReady ? (
            <div className="flex flex-col items-center gap-4 text-center py-4">
              <Loader2 className="text-gold/50 animate-spin" size={28} />
              <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
                جاري التحقق من الرابط...
              </p>
              <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">
                إذا وصلت إلى هذه الصفحة مباشرة، يرجى استخدام رابط إعادة التعيين المرسل إلى بريدك الإلكتروني.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New password */}
              <div className="space-y-2">
                <label
                  htmlFor="new-password"
                  className="block text-sm font-[family-name:var(--font-display)] text-white/70"
                >
                  {t('auth.new_password')}
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gold/10 text-white placeholder:text-white/30 font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/40 transition-colors"
                />
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-[family-name:var(--font-display)] text-white/70"
                >
                  {t('auth.confirm_password')}
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gold/10 text-white placeholder:text-white/30 font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/40 transition-colors"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm font-[family-name:var(--font-display)]">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gold text-ink font-[family-name:var(--font-display)] font-bold text-sm transition-all hover:bg-gold-muted disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  t('auth.update_password')
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
