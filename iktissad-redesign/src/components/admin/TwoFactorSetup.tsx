'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Shield, ShieldCheck, ShieldOff, Copy, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type SetupStep = 'idle' | 'enrolling' | 'verifying' | 'success' | 'recovery-codes';

interface EnrollmentData {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

export default function TwoFactorSetup() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [enrolledFactorId, setEnrolledFactorId] = useState<string | null>(null);
  const [step, setStep] = useState<SetupStep>('idle');
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryCodesCopied, setRecoveryCodesCopied] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Load current 2FA status
  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;

      const totpFactors = data?.totp ?? [];
      const verifiedFactor = totpFactors.find(f => f.status === 'verified');
      if (verifiedFactor) {
        setIsEnabled(true);
        setEnrolledFactorId(verifiedFactor.id);
      } else {
        setIsEnabled(false);
        setEnrolledFactorId(null);
      }
    } catch {
      toast.error('تعذر تحميل حالة المصادقة الثنائية');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Focus code input when verifying step is shown
  useEffect(() => {
    if (step === 'verifying' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  const handleStartEnrollment = async () => {
    setActionLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'تطبيق المصادقة',
      });
      if (enrollError) throw enrollError;

      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
      setStep('enrolling');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء بدء التسجيل';
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartVerification = async () => {
    if (!enrollment) return;
    setActionLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollment.factorId,
      });
      if (challengeError) throw challengeError;

      setChallengeId(data.id);
      setStep('verifying');
      setCode('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء التحقق';
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment || !challengeId || code.length !== 6) return;
    setActionLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId,
        code,
      });
      if (verifyError) throw verifyError;

      setIsEnabled(true);
      setEnrolledFactorId(enrollment.factorId);

      // Generate recovery codes immediately after successful enrollment
      try {
        const res = await fetch('/api/auth/2fa/recovery-codes', { method: 'POST' });
        if (res.ok) {
          const json = await res.json() as { data?: { codes?: string[] } };
          if (json.data?.codes) {
            setRecoveryCodes(json.data.codes);
            setStep('recovery-codes');
          } else {
            setStep('success');
          }
        } else {
          setStep('success');
        }
      } catch {
        setStep('success');
      }

      toast.success('تم تفعيل المصادقة الثنائية بنجاح');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'الرمز غير صحيح، يرجى المحاولة مجدداً';
      setError('الرمز غير صحيح أو انتهت صلاحيته، يرجى المحاولة مجدداً');
      toast.error(msg);
      setCode('');
      if (codeInputRef.current) codeInputRef.current.focus();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!enrolledFactorId) return;
    setActionLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: enrolledFactorId,
      });
      if (unenrollError) throw unenrollError;

      setIsEnabled(false);
      setEnrolledFactorId(null);
      setStep('idle');
      setEnrollment(null);
      setRecoveryCodes([]);
      // Delete recovery codes server-side
      void fetch('/api/auth/2fa/recovery-codes', { method: 'DELETE' }).catch(() => {});
      toast.success('تم تعطيل المصادقة الثنائية');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تعطيل المصادقة الثنائية';
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEnrollment = async () => {
    // Unenroll the pending (unverified) factor if one exists
    if (enrollment?.factorId) {
      const supabase = createClient();
      await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId }).catch(() => {});
    }
    setStep('idle');
    setEnrollment(null);
    setChallengeId(null);
    setCode('');
    setError('');
  };

  const handleCopySecret = async () => {
    if (!enrollment?.secret) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      toast.error('تعذر النسخ');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  // ── RECOVERY CODES STATE ─────────────────────────────────────────────────────
  if (step === 'recovery-codes' && recoveryCodes.length > 0) {
    const handleCopyAll = async () => {
      try {
        await navigator.clipboard.writeText(recoveryCodes.join('\n'));
        setRecoveryCodesCopied(true);
        setTimeout(() => setRecoveryCodesCopied(false), 2000);
      } catch {
        toast.error('تعذر النسخ');
      }
    };

    return (
      <div className="p-5 bg-white/5 border border-gold/10 rounded-xl space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="text-gold" size={22} />
          </div>
          <div className="flex-1">
            <p className="text-white font-[family-name:var(--font-display)] font-semibold text-base">
              رموز الاسترداد
            </p>
            <p className="text-white/50 text-sm mt-1 font-[family-name:var(--font-display)]">
              احتفظ بهذه الرموز في مكان آمن. كل رمز يُستخدم مرة واحدة فقط للدخول إذا فقدت الوصول إلى تطبيق المصادقة.
            </p>
          </div>
        </div>

        {/* Recovery codes grid */}
        <div className="grid grid-cols-2 gap-2">
          {recoveryCodes.map((c) => (
            <code
              key={c}
              dir="ltr"
              className="bg-obsidian/60 border border-gold/10 rounded-lg px-3 py-2 text-gold text-sm font-mono tracking-wider text-center select-all"
            >
              {c}
            </code>
          ))}
        </div>

        <div className="p-3 bg-gold/10 border border-gold/20 rounded-xl">
          <p className="text-gold text-xs font-[family-name:var(--font-display)]">
            ⚠️ هذه الرموز لن تُعرض مرة أخرى. انسخها أو دوّنها الآن.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCopyAll}
            className="flex-1 py-2.5 bg-white/10 text-white rounded-xl font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            {recoveryCodesCopied ? (
              <><Check size={14} className="text-profit" /> تم النسخ</>
            ) : (
              <><Copy size={14} /> نسخ الكل</>
            )}
          </button>
          <button
            onClick={() => setStep('success')}
            className="flex-1 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:shadow-gold transition-all"
          >
            تم الحفظ
          </button>
        </div>
      </div>
    );
  }

  // ── SUCCESS STATE ────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="p-5 bg-profit/5 border border-profit/20 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-profit/10 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="text-profit" size={22} />
          </div>
          <div className="flex-1">
            <p className="text-white font-[family-name:var(--font-display)] font-semibold text-base">
              تم تفعيل المصادقة الثنائية بنجاح
            </p>
            <p className="text-white/50 text-sm mt-1 font-[family-name:var(--font-display)]">
              حسابك محمي الآن بطبقة أمان إضافية. ستحتاج إلى رمز التحقق عند كل تسجيل دخول.
            </p>
            <button
              onClick={() => setStep('idle')}
              className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors"
            >
              حسناً
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── VERIFYING STEP ───────────────────────────────────────────────────────────
  if (step === 'verifying') {
    return (
      <div className="p-5 bg-white/5 border border-gold/10 rounded-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="text-gold" size={18} />
          </div>
          <div>
            <p className="text-white font-[family-name:var(--font-display)] font-semibold">
              أدخل رمز التحقق
            </p>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              افتح تطبيق المصادقة وأدخل الرمز المكوّن من 6 أرقام
            </p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
                setError('');
              }}
              placeholder="000000"
              dir="ltr"
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-4 px-4 text-white text-center text-2xl font-mono tracking-[0.5em] placeholder:text-white/20 focus:outline-none focus:border-gold/40 transition-colors"
              autoComplete="one-time-code"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm font-[family-name:var(--font-display)]">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={actionLoading || code.length !== 6}
              className="flex-1 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:shadow-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {actionLoading && <Loader2 size={14} className="animate-spin" />}
              تحقق وتفعيل
            </button>
            <button
              type="button"
              onClick={handleCancelEnrollment}
              disabled={actionLoading}
              className="px-4 py-2.5 bg-white/10 text-white/70 rounded-xl font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── ENROLLING STEP ───────────────────────────────────────────────────────────
  if (step === 'enrolling' && enrollment) {
    return (
      <div className="p-5 bg-white/5 border border-gold/10 rounded-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="text-gold" size={18} />
          </div>
          <div>
            <p className="text-white font-[family-name:var(--font-display)] font-semibold">
              إعداد المصادقة الثنائية
            </p>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              امسح رمز QR باستخدام تطبيق المصادقة (Google Authenticator، Authy، إلخ)
            </p>
          </div>
        </div>

        {/* Step 1: QR Code */}
        <div className="space-y-3">
          <p className="text-white/70 text-sm font-[family-name:var(--font-display)] font-semibold">
            الخطوة ١: امسح رمز QR
          </p>
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-xl inline-block">
              {/* qr_code is a data URL SVG/PNG from Supabase */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollment.qrCode}
                alt="رمز QR للمصادقة الثنائية"
                width={180}
                height={180}
                className="block"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Manual secret */}
        <div className="space-y-3">
          <p className="text-white/70 text-sm font-[family-name:var(--font-display)] font-semibold">
            الخطوة ٢: أو أدخل المفتاح يدوياً
          </p>
          <div className="flex items-center gap-2">
            <code
              dir="ltr"
              className="flex-1 bg-obsidian/60 border border-gold/10 rounded-xl px-4 py-3 text-gold text-sm font-mono tracking-wider break-all select-all"
            >
              {enrollment.secret}
            </code>
            <button
              onClick={handleCopySecret}
              className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors text-white shrink-0"
              title="نسخ المفتاح"
            >
              {secretCopied ? (
                <Check size={16} className="text-profit" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
          {secretCopied && (
            <p className="text-profit text-xs font-[family-name:var(--font-display)]">
              تم نسخ المفتاح
            </p>
          )}
        </div>

        {/* Step 3: CTA */}
        <div className="space-y-3">
          <p className="text-white/70 text-sm font-[family-name:var(--font-display)] font-semibold">
            الخطوة ٣: تحقق من التطبيق
          </p>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            بعد مسح الرمز، أدخل الرمز المكوّن من 6 أرقام الذي يظهر في التطبيق للتأكيد.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm font-[family-name:var(--font-display)]">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleStartVerification}
            disabled={actionLoading}
            className="flex-1 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:shadow-gold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading && <Loader2 size={14} className="animate-spin" />}
            التالي: إدخال الرمز
          </button>
          <button
            type="button"
            onClick={handleCancelEnrollment}
            disabled={actionLoading}
            className="px-4 py-2.5 bg-white/10 text-white/70 rounded-xl font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    );
  }

  // ── IDLE STATE (enabled or disabled) ────────────────────────────────────────
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 border border-gold/10 rounded-xl">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isEnabled ? 'bg-profit/10' : 'bg-gold/10'
          }`}
        >
          {isEnabled ? (
            <ShieldCheck className="text-profit" size={20} />
          ) : (
            <Shield className="text-gold" size={20} />
          )}
        </div>
        <div>
          <p className="text-white font-[family-name:var(--font-display)] font-semibold">
            المصادقة الثنائية (TOTP)
          </p>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {isEnabled
              ? 'مفعّلة — حسابك محمي بطبقة أمان إضافية'
              : 'أضف طبقة أمان إضافية لحسابك'}
          </p>
        </div>
      </div>

      {isEnabled ? (
        <button
          onClick={handleDisable}
          disabled={actionLoading}
          className="px-4 py-2 bg-loss/10 text-loss rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-loss/20 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {actionLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ShieldOff size={14} />
          )}
          تعطيل
        </button>
      ) : (
        <button
          onClick={handleStartEnrollment}
          disabled={actionLoading}
          className="px-4 py-2 bg-gold/10 text-gold rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-gold/20 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {actionLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Shield size={14} />
          )}
          تفعيل
        </button>
      )}
    </div>
  );
}
