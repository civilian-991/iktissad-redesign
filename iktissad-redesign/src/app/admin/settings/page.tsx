'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Palette,
  Mail,
  Database,
  Save,
  Loader2,
  Sun,
  Moon,
  Check,
  ChevronDown,
  Lock,
  Eye,
  EyeOff,
  Upload,
  RefreshCw
} from 'lucide-react';
import TwoFactorSetup from '@/components/admin/TwoFactorSetup';

const tabs = [
  { id: 'general', label: 'عام', icon: Settings },
  { id: 'appearance', label: 'المظهر', icon: Palette },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'security', label: 'الأمان', icon: Shield },
  { id: 'email', label: 'البريد', icon: Mail },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: Database },
];

const languages = [
  { code: 'ar', name: 'العربية' },
  { code: 'en', name: 'English' },
];

const timezones = [
  { value: 'Asia/Beirut', label: 'بيروت (GMT+2)' },
  { value: 'Asia/Dubai', label: 'دبي (GMT+4)' },
  { value: 'Asia/Riyadh', label: 'الرياض (GMT+3)' },
  { value: 'Africa/Cairo', label: 'القاهرة (GMT+2)' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // General settings
  const [siteName, setSiteName] = useState('الإقتصاد والأعمال');
  const [siteDescription, setSiteDescription] = useState('المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي');
  const [language, setLanguage] = useState('ar');
  const [timezone, setTimezone] = useState('Asia/Beirut');

  // Appearance
  const [darkMode, setDarkMode] = useState(true);
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [fontSize, setFontSize] = useState('medium');

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newArticleNotify, setNewArticleNotify] = useState(true);
  const [newCommentNotify, setNewCommentNotify] = useState(true);
  const [newUserNotify, setNewUserNotify] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);

  // Security
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email
  const [smtpHost, setSmtpHost] = useState('smtp.iktissad.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('noreply@iktissad.com');
  const [smtpPass, setSmtpPass] = useState('');

  // Backup
  const [autoBackup, setAutoBackup] = useState('weekly');

  // Load settings from API on mount
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const json = await res.json();
        const s = json.data ?? {};

        // General
        if (s.general) {
          const g = s.general;
          if (g.siteName) setSiteName(g.siteName);
          if (g.siteDescription) setSiteDescription(g.siteDescription);
          if (g.language) setLanguage(g.language);
          if (g.timezone) setTimezone(g.timezone);
        }

        // Appearance
        if (s.appearance) {
          const a = s.appearance;
          if (a.darkMode !== undefined) setDarkMode(a.darkMode);
          if (a.accentColor) setAccentColor(a.accentColor);
          if (a.fontSize) setFontSize(a.fontSize);
        }

        // Notifications
        if (s.notifications) {
          const n = s.notifications;
          if (n.emailNotifications !== undefined) setEmailNotifications(n.emailNotifications);
          if (n.newArticleNotify !== undefined) setNewArticleNotify(n.newArticleNotify);
          if (n.newCommentNotify !== undefined) setNewCommentNotify(n.newCommentNotify);
          if (n.newUserNotify !== undefined) setNewUserNotify(n.newUserNotify);
          if (n.weeklyReport !== undefined) setWeeklyReport(n.weeklyReport);
        }

        // Security
        if (s.security) {
          const sec = s.security;
          if (sec.sessionTimeout) setSessionTimeout(sec.sessionTimeout);
        }

        // Email
        if (s.email) {
          const e = s.email;
          if (e.smtpHost) setSmtpHost(e.smtpHost);
          if (e.smtpPort) setSmtpPort(e.smtpPort);
          if (e.smtpUser) setSmtpUser(e.smtpUser);
        }

        // Backup
        if (s.backup) {
          const b = s.backup;
          if (b.autoBackup) setAutoBackup(b.autoBackup);
        }
      } catch {
        toast.error('تعذر تحميل الإعدادات');
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  // Build the value object for the current active tab
  const getTabValue = useCallback(() => {
    switch (activeTab) {
      case 'general':
        return { siteName, siteDescription, language, timezone };
      case 'appearance':
        return { darkMode, accentColor, fontSize };
      case 'notifications':
        return { emailNotifications, newArticleNotify, newCommentNotify, newUserNotify, weeklyReport };
      case 'security':
        return { sessionTimeout };
      case 'email':
        return { smtpHost, smtpPort, smtpUser };
      case 'backup':
        return { autoBackup };
      default:
        return {};
    }
  }, [
    activeTab,
    siteName, siteDescription, language, timezone,
    darkMode, accentColor, fontSize,
    emailNotifications, newArticleNotify, newCommentNotify, newUserNotify, weeklyReport,
    sessionTimeout,
    smtpHost, smtpPort, smtpUser,
    autoBackup,
  ]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: activeTab, value: getTabValue() }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'خطأ غير معروف');
      }
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الإعدادات';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, getTabValue]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('يرجى ملء جميع حقول كلمة المرور');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقتين');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'خطأ غير معروف');
      toast.success('تم تحديث كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث كلمة المرور';
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gold" />
        </div>
      );
    }

    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                اسم الموقع
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                وصف الموقع
              </label>
              <textarea
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors resize-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  اللغة الافتراضية
                </label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors appearance-none"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-midnight">
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <Globe className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  المنطقة الزمنية
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
                >
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value} className="bg-midnight">
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
                شعار الموقع
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-gold via-gold-muted to-bronze rounded-xl flex items-center justify-center">
                  <span className="text-obsidian font-[family-name:var(--font-display)] font-black text-3xl">إ</span>
                </div>
                <label className="px-4 py-2 bg-white/10 text-white rounded-lg cursor-pointer hover:bg-white/20 transition-colors font-[family-name:var(--font-display)] text-sm flex items-center gap-2">
                  <Upload size={16} />
                  تغيير الشعار
                  <input type="file" accept="image/*" className="hidden" />
                </label>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
                الوضع الافتراضي
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setDarkMode(false)}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                    !darkMode
                      ? 'bg-gold/10 border-gold text-gold'
                      : 'bg-white/5 border-gold/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <Sun size={20} />
                  <span className="font-[family-name:var(--font-display)]">فاتح</span>
                </button>
                <button
                  onClick={() => setDarkMode(true)}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                    darkMode
                      ? 'bg-gold/10 border-gold text-gold'
                      : 'bg-white/5 border-gold/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <Moon size={20} />
                  <span className="font-[family-name:var(--font-display)]">داكن</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
                اللون الرئيسي
              </label>
              <div className="flex items-center gap-4">
                {['#f59e0b', '#005B9F', '#059669', '#dc2626', '#0d9488'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setAccentColor(color)}
                    className={`w-10 h-10 rounded-xl transition-all ${
                      accentColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-obsidian' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {accentColor === color && (
                      <Check size={16} className="mx-auto text-white" />
                    )}
                  </button>
                ))}
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
                حجم الخط
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'small', label: 'صغير' },
                  { value: 'medium', label: 'متوسط' },
                  { value: 'large', label: 'كبير' },
                ].map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setFontSize(size.value)}
                    className={`flex-1 py-2.5 rounded-xl font-[family-name:var(--font-display)] text-sm transition-all ${
                      fontSize === size.value
                        ? 'bg-gold text-obsidian font-semibold'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            {[
              { key: 'emailNotifications', label: 'تفعيل الإشعارات بالبريد', desc: 'استلام الإشعارات عبر البريد الإلكتروني', value: emailNotifications, setter: setEmailNotifications },
              { key: 'newArticleNotify', label: 'مقال جديد', desc: 'إشعار عند نشر مقال جديد', value: newArticleNotify, setter: setNewArticleNotify },
              { key: 'newCommentNotify', label: 'تعليق جديد', desc: 'إشعار عند إضافة تعليق جديد', value: newCommentNotify, setter: setNewCommentNotify },
              { key: 'newUserNotify', label: 'مستخدم جديد', desc: 'إشعار عند تسجيل مستخدم جديد', value: newUserNotify, setter: setNewUserNotify },
              { key: 'weeklyReport', label: 'التقرير الأسبوعي', desc: 'استلام تقرير أسبوعي بالإحصائيات', value: weeklyReport, setter: setWeeklyReport },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 bg-white/5 border border-gold/10 rounded-xl"
              >
                <div>
                  <p className="text-white font-[family-name:var(--font-display)] font-semibold">
                    {item.label}
                  </p>
                  <p className="text-white/50 text-sm">
                    {item.desc}
                  </p>
                </div>
                <button
                  onClick={() => item.setter(!item.value)}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    item.value ? 'bg-gold' : 'bg-white/10'
                  }`}
                >
                  <motion.div
                    animate={{ x: item.value ? 24 : 0 }}
                    className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full"
                  />
                </button>
              </div>
            ))}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            {/* Two Factor Auth */}
            <TwoFactorSetup />

            {/* Session Timeout */}
            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                انتهاء الجلسة (بالدقائق)
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
              >
                <option value="15" className="bg-midnight">15 دقيقة</option>
                <option value="30" className="bg-midnight">30 دقيقة</option>
                <option value="60" className="bg-midnight">ساعة</option>
                <option value="120" className="bg-midnight">ساعتين</option>
              </select>
            </div>

            {/* Change Password */}
            <div className="p-4 bg-white/5 border border-gold/10 rounded-xl">
              <h3 className="text-white font-[family-name:var(--font-display)] font-semibold mb-4 flex items-center gap-2">
                <Lock size={16} className="text-gold" />
                تغيير كلمة المرور
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="كلمة المرور الحالية"
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-4 pl-12 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تأكيد كلمة المرور الجديدة"
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                />
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="px-4 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] text-sm font-semibold hover:shadow-gold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isChangingPassword && <Loader2 size={14} className="animate-spin" />}
                  تحديث كلمة المرور
                </button>
              </div>
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  SMTP Port
                </label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  SMTP Password
                </label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>
            </div>

            <button className="px-4 py-2.5 bg-white/10 text-white rounded-xl font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors flex items-center gap-2">
              <Mail size={16} />
              إرسال بريد تجريبي
            </button>
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-6">
            <div className="p-6 bg-white/5 border border-gold/10 rounded-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center">
                  <Database className="text-gold" size={20} />
                </div>
                <div>
                  <p className="text-white font-[family-name:var(--font-display)] font-semibold">
                    النسخ الاحتياطي
                  </p>
                  <p className="text-white/50 text-sm">
                    آخر نسخة: 15 يناير 2024، 10:30 ص
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] text-sm font-semibold hover:shadow-gold transition-all flex items-center gap-2">
                  <Database size={16} />
                  إنشاء نسخة احتياطية
                </button>
                <button className="px-4 py-2.5 bg-white/10 text-white rounded-xl font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors flex items-center gap-2">
                  <RefreshCw size={16} />
                  استعادة
                </button>
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
                النسخ الاحتياطي التلقائي
              </label>
              <select
                value={autoBackup}
                onChange={(e) => setAutoBackup(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
              >
                <option value="daily" className="bg-midnight">يومياً</option>
                <option value="weekly" className="bg-midnight">أسبوعياً</option>
                <option value="monthly" className="bg-midnight">شهرياً</option>
                <option value="disabled" className="bg-midnight">معطّل</option>
              </select>
            </div>

            <div className="p-4 bg-gold/10 border border-gold/20 rounded-xl">
              <p className="text-gold text-sm font-[family-name:var(--font-display)]">
                💡 يُنصح بإنشاء نسخة احتياطية قبل إجراء أي تغييرات كبيرة على الموقع
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            الإعدادات
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            إدارة إعدادات الموقع والتفضيلات
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          حفظ التغييرات
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-[family-name:var(--font-display)] text-sm ${
                  activeTab === tab.id
                    ? 'bg-gold/10 text-gold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3"
        >
          <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-6 flex items-center gap-2">
              {tabs.find(t => t.id === activeTab)?.icon && (
                <span className="text-gold">
                  {(() => {
                    const Icon = tabs.find(t => t.id === activeTab)?.icon;
                    return Icon ? <Icon size={18} /> : null;
                  })()}
                </span>
              )}
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            {renderTabContent()}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
