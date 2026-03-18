'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

interface LoginClientProps {
  redirectTo?: string;
}

type LoginStep = 'credentials' | 'mfa';

export default function LoginClient({ redirectTo }: LoginClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('credentials');

  // Credentials step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // MFA step
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const mfaInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-focus MFA input when step changes
  useEffect(() => {
    if (step === 'mfa' && mfaInputRef.current) {
      mfaInputRef.current.focus();
    }
  }, [step]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
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

    // Check if 2FA is required
    const { data: aalData, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      // Non-fatal: proceed to admin if we can't determine AAL
      router.push(redirectTo ?? '/admin');
      router.refresh();
      return;
    }

    const { currentLevel, nextLevel } = aalData;

    if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
      // User has 2FA enrolled — need to verify TOTP
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError || !factorsData?.totp?.length) {
        // Fallback: can't list factors, redirect anyway
        router.push(redirectTo ?? '/admin');
        router.refresh();
        setLoading(false);
        return;
      }

      const totp = factorsData.totp[0];

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totp.id });

      if (challengeError) {
        setError('تعذر إنشاء تحقق المصادقة الثنائية، يرجى المحاولة مجدداً');
        setLoading(false);
        return;
      }

      setFactorId(totp.id);
      setChallengeId(challengeData.id);
      setMfaCode('');
      setStep('mfa');
      setLoading(false);
      return;
    }

    // No 2FA needed — go straight to admin
    router.push(redirectTo ?? '/admin');
    router.refresh();
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) return;
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: mfaCode,
    });

    if (verifyError) {
      setError('الرمز غير صحيح أو انتهت صلاحيته، يرجى المحاولة مجدداً');
      setMfaCode('');
      if (mfaInputRef.current) mfaInputRef.current.focus();
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
            {step === 'mfa'
              ? 'التحقق بخطوتين'
              : 'تسجيل الدخول إلى لوحة التحكم'}
          </p>
        </div>

        {/* ── MFA STEP ── */}
        {step === 'mfa' && (
          <form
            onSubmit={handleMfaSubmit}
            className="bg-midnight border border-gold/10 rounded-2xl p-8 space-y-5 shadow-2xl"
          >
            {/* Icon + description */}
            <div className="flex flex-col items-center gap-3 pb-2">
              <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center">
                <Shield className="text-gold" size={26} />
              </div>
              <p className="text-white/70 text-sm font-[family-name:var(--font-display)] text-center leading-relaxed">
                أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة الخاص بك
              </p>
            </div>

            {/* Code input */}
            <div className="space-y-2">
              <label
                htmlFor="mfa-code"
                className="block text-sm font-[family-name:var(--font-display)] text-white/70"
              >
                رمز التحقق
              </label>
              <input
                ref={mfaInputRef}
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setMfaCode(val);
                  setError('');
                }}
                placeholder="000000"
                dir="ltr"
                className="w-full px-4 py-4 rounded-xl bg-white/5 border border-gold/10 text-white placeholder:text-white/30 font-mono text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-gold/40 transition-colors"
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
              disabled={loading || mfaCode.length !== 6}
              className="w-full py-3 rounded-xl bg-gold text-obsidian font-[family-name:var(--font-display)] font-bold text-sm transition-all hover:bg-gold-muted disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                'تأكيد'
              )}
            </button>

            {/* Back link */}
            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setError('');
                setMfaCode('');
              }}
              className="w-full text-center text-white/40 text-sm font-[family-name:var(--font-display)] hover:text-white/70 transition-colors"
            >
              العودة إلى تسجيل الدخول
            </button>
          </form>
        )}

        {/* ── CREDENTIALS STEP ── */}
        {step === 'credentials' && (
          <form
            onSubmit={handleCredentialsSubmit}
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
              <div className="flex items-center gap-2 text-red-400 text-sm font-[family-name:var(--font-display)]">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
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
        )}
      </div>
    </div>
  );
}
