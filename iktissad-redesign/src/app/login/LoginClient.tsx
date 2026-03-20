'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n';
import { Loader2, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface LoginClientProps {
  redirectTo?: string;
}

type LoginStep = 'credentials' | 'mfa';
type LoginMode = 'password' | 'magic_link' | 'forgot_password';

// Google "G" logo SVG — inline so no extra deps needed
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginClient({ redirectTo }: LoginClientProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('credentials');
  const [mode, setMode] = useState<LoginMode>('password');

  // Credentials step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // MFA step
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const mfaInputRef = useRef<HTMLInputElement>(null);

  // Forgot password / magic link
  const [forgotEmail, setForgotEmail] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-focus MFA input when step changes
  useEffect(() => {
    if (step === 'mfa' && mfaInputRef.current) {
      mfaInputRef.current.focus();
    }
  }, [step]);

  // Reset sub-state when switching modes
  const switchMode = (next: LoginMode) => {
    setMode(next);
    setError('');
    setResetSent(false);
    setMagicSent(false);
    setForgotEmail('');
    setMagicEmail('');
  };

  // ── Google OAuth ──────────────────────────────────────────────────────────
  // NOTE: Google provider must be enabled in Supabase Dashboard →
  // Authentication → Providers → Google, with a valid Google OAuth
  // client ID and secret from Google Cloud Console.
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    });
    if (oauthError) {
      setError('تعذر بدء تسجيل الدخول عبر Google. يرجى المحاولة مجدداً.');
      setLoading(false);
    }
    // On success Supabase redirects the browser — no further action needed
  };

  // ── Credentials (email + password) ───────────────────────────────────────
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
      router.push(redirectTo ?? '/admin');
      router.refresh();
      return;
    }

    const { currentLevel, nextLevel } = aalData;

    if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError || !factorsData?.totp?.length) {
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

    router.push(redirectTo ?? '/admin');
    router.refresh();
  };

  // ── MFA verify ───────────────────────────────────────────────────────────
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

  // ── Forgot password ───────────────────────────────────────────────────────
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      forgotEmail,
      { redirectTo: window.location.origin + '/auth/reset-password' },
    );

    if (resetError) {
      setError('تعذر إرسال رابط إعادة التعيين. يرجى التحقق من البريد الإلكتروني والمحاولة مجدداً.');
      setLoading(false);
      return;
    }

    setResetSent(true);
    setLoading(false);
  };

  // ── Magic link ────────────────────────────────────────────────────────────
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    });

    if (otpError) {
      setError('تعذر إرسال رابط تسجيل الدخول. يرجى المحاولة مجدداً.');
      setLoading(false);
      return;
    }

    setMagicSent(true);
    setLoading(false);
  };

  // ── Shared sub-components ─────────────────────────────────────────────────

  // Divider with Google button — shown above the email/password form
  const socialSection = (
    <>
      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-white text-gray-800 font-[family-name:var(--font-display)] font-medium text-sm transition-all hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-gray-200"
      >
        <GoogleIcon />
        <span>{t('auth.google_login')}</span>
      </button>

      {/* Or divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gold/10" />
        <span className="text-white/30 text-xs font-[family-name:var(--font-display)]">
          {t('auth.or_divider')}
        </span>
        <div className="flex-1 h-px bg-gold/10" />
      </div>
    </>
  );

  // Mode tab toggle — password vs magic link
  const modeTabs = (
    <div className="flex rounded-xl bg-white/5 border border-gold/10 p-1 gap-1">
      <button
        type="button"
        onClick={() => switchMode('password')}
        className={`flex-1 py-2 px-3 rounded-lg text-xs font-[family-name:var(--font-display)] transition-all ${
          mode === 'password'
            ? 'bg-gold text-obsidian font-bold'
            : 'text-white/50 hover:text-white/80'
        }`}
      >
        كلمة المرور
      </button>
      <button
        type="button"
        onClick={() => switchMode('magic_link')}
        className={`flex-1 py-2 px-3 rounded-lg text-xs font-[family-name:var(--font-display)] transition-all ${
          mode === 'magic_link'
            ? 'bg-gold text-obsidian font-bold'
            : 'text-white/50 hover:text-white/80'
        }`}
      >
        {t('auth.magic_link_tab')}
      </button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
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
            <div className="flex flex-col items-center gap-3 pb-2">
              <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center">
                <Shield className="text-gold" size={26} />
              </div>
              <p className="text-white/70 text-sm font-[family-name:var(--font-display)] text-center leading-relaxed">
                أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة الخاص بك
              </p>
            </div>

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

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm font-[family-name:var(--font-display)]">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

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
          <div className="bg-midnight border border-gold/10 rounded-2xl p-8 shadow-2xl space-y-5">

            {/* Google + divider (shown for password and magic_link modes) */}
            {(mode === 'password' || mode === 'magic_link') && socialSection}

            {/* Mode tabs */}
            {modeTabs}

            {/* ── Password mode ── */}
            {mode === 'password' && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
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
                  {/* Forgot password link */}
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    className="text-xs text-gold/60 hover:text-gold transition-colors font-[family-name:var(--font-display)] mt-1"
                  >
                    {t('auth.forgot_password')}
                  </button>
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

            {/* ── Magic link mode ── */}
            {mode === 'magic_link' && (
              <div className="space-y-5">
                {magicSent ? (
                  <div className="flex flex-col items-center gap-3 text-center py-2">
                    <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                      <CheckCircle className="text-green-400" size={24} />
                    </div>
                    <p className="text-white/80 text-sm font-[family-name:var(--font-display)] leading-relaxed">
                      {t('auth.magic_link_sent')}
                    </p>
                    <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
                      تحقق من بريدك الإلكتروني وانقر على الرابط للدخول
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="magic-email"
                        className="block text-sm font-[family-name:var(--font-display)] text-white/70"
                      >
                        البريد الإلكتروني
                      </label>
                      <input
                        id="magic-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={magicEmail}
                        onChange={(e) => { setMagicEmail(e.target.value); setError(''); }}
                        placeholder="you@example.com"
                        dir="ltr"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gold/10 text-white placeholder:text-white/30 font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/40 transition-colors"
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-red-400 text-sm font-[family-name:var(--font-display)]">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-gold text-obsidian font-[family-name:var(--font-display)] font-bold text-sm transition-all hover:bg-gold-muted disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري الإرسال...</span>
                        </>
                      ) : (
                        'إرسال رابط الدخول'
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ── Forgot password mode ── */}
            {mode === 'forgot_password' && (
              <div className="space-y-5">
                {/* Back link */}
                <button
                  type="button"
                  onClick={() => switchMode('password')}
                  className="text-white/40 text-xs font-[family-name:var(--font-display)] hover:text-white/70 transition-colors flex items-center gap-1"
                >
                  <span>→</span>
                  <span>العودة إلى تسجيل الدخول</span>
                </button>

                {resetSent ? (
                  <div className="flex flex-col items-center gap-3 text-center py-2">
                    <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                      <CheckCircle className="text-green-400" size={24} />
                    </div>
                    <p className="text-white/80 text-sm font-[family-name:var(--font-display)] leading-relaxed">
                      {t('auth.reset_sent')}
                    </p>
                    <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
                      تحقق من بريدك الإلكتروني واتبع التعليمات
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="forgot-email"
                        className="block text-sm font-[family-name:var(--font-display)] text-white/70"
                      >
                        البريد الإلكتروني
                      </label>
                      <input
                        id="forgot-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={forgotEmail}
                        onChange={(e) => { setForgotEmail(e.target.value); setError(''); }}
                        placeholder="you@example.com"
                        dir="ltr"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gold/10 text-white placeholder:text-white/30 font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/40 transition-colors"
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-red-400 text-sm font-[family-name:var(--font-display)]">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-gold text-obsidian font-[family-name:var(--font-display)] font-bold text-sm transition-all hover:bg-gold-muted disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري الإرسال...</span>
                        </>
                      ) : (
                        'إرسال رابط إعادة التعيين'
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
