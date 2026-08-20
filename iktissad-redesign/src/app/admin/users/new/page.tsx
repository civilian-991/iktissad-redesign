'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRight,
  Save,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Building,
  Phone,
  Upload,
  X,
  Loader2
} from 'lucide-react';
import { createUser } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';

export default function NewUserPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const roleOptions = [
    { value: 'admin', label: t('admin.users.roles.admin'), description: t('admin.users.roles.adminDesc') },
    { value: 'editor', label: t('admin.users.roles.editor'), description: t('admin.users.roles.editorDesc') },
    { value: 'author', label: t('admin.users.roles.writer'), description: t('admin.users.roles.writerDesc') },
    { value: 'contributor', label: t('admin.users.roles.contributor'), description: t('admin.users.roles.contributorDesc') },
  ];

  const departmentOptions = [
    { value: 'management', label: t('admin.users.departments.management') },
    { value: 'editorial', label: t('admin.users.departments.editorial') },
    { value: 'economy', label: t('admin.users.departments.economy') },
    { value: 'markets', label: t('admin.users.departments.markets') },
    { value: 'companies', label: t('admin.users.departments.companies') },
    { value: 'tech', label: t('admin.users.departments.tech') },
    { value: 'energy', label: t('admin.users.departments.energy') },
    { value: 'opinion', label: t('admin.users.departments.opinion') },
  ];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('author');
  const [department, setDepartment] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [sendInvite, setSendInvite] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('admin.users.form.validation.nameRequired'));
      return;
    }
    if (!email.trim()) {
      toast.error(t('admin.users.form.validation.emailRequired'));
      return;
    }
    if (password && password !== confirmPassword) {
      toast.error(t('admin.users.form.validation.passwordMismatch'));
      return;
    }
    setIsSaving(true);
    try {
      await createUser({
        name,
        email,
        password: password || undefined,
        phone: phone || undefined,
        role,
        department: department || undefined,
        avatar: avatar || undefined,
        status: 'active',
      });
      toast.success(t('admin.users.form.success'));
      router.push('/admin/users');
    } catch (err: any) {
      toast.error(err.message || t('admin.users.form.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/users"
            className="p-2 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
              {t('admin.users.form.newTitle')}
            </h1>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              {t('admin.users.form.newSubtitle')}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !name || !email}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-ink font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {t('admin.users.form.save')}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-6 flex items-center gap-2">
              <User size={18} className="text-gold" />
              {t('admin.users.form.basicInfo')}
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.users.form.fullName')} <span className="text-loss">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('admin.users.form.fullNamePlaceholder')}
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                  />
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.users.form.email')} <span className="text-loss">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@iktissad.com"
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                  />
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.users.form.phone')}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+961 XX XXX XXX"
                    dir="ltr"
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors text-left"
                  />
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.users.form.department')}
                </label>
                <div className="relative">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors appearance-none"
                  >
                    <option value="" className="bg-midnight">{t('admin.users.form.departmentPlaceholder')}</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept.value} value={dept.label} className="bg-midnight">
                        {dept.label}
                      </option>
                    ))}
                  </select>
                  <Building className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-6 flex items-center gap-2">
              <Lock size={18} className="text-gold" />
              {t('admin.users.form.password')}
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Password */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.users.form.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-12 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                  />
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.users.form.confirmPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                  />
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
                </div>
              </div>
            </div>

            {/* Send Invite Option */}
            <label className="flex items-center gap-3 mt-6 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 transition-all ${
                  sendInvite
                    ? 'bg-gold border-gold'
                    : 'border-white/20 group-hover:border-white/40'
                }`}>
                  {sendInvite && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-full h-full text-ink p-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </motion.svg>
                  )}
                </div>
              </div>
              <div>
                <span className="text-white font-[family-name:var(--font-display)] text-sm">
                  {t('admin.users.form.sendInvite')}
                </span>
                <p className="text-white/40 text-xs">
                  {t('admin.users.form.sendInviteDesc')}
                </p>
              </div>
            </label>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-3">
              {t('admin.users.form.avatar')}
            </label>
            {avatar ? (
              <div className="relative group">
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-full aspect-square object-cover rounded-xl"
                />
                <button
                  onClick={() => setAvatar(null)}
                  className="absolute top-2 left-2 p-1.5 bg-obsidian/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-gold/20 rounded-xl cursor-pointer hover:border-gold/40 transition-colors">
                <Upload className="text-gold/50 mb-2" size={32} />
                <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
                  {t('admin.users.form.avatarUpload')}
                </span>
                <span className="text-white/30 text-xs mt-1">
                  {t('admin.users.form.avatarFormat')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatar(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            )}
          </motion.div>

          {/* Role */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <label className="flex items-center gap-2 text-white/70 text-sm font-[family-name:var(--font-display)] mb-4">
              <Shield size={14} className="text-gold" />
              {t('admin.users.form.role')}
            </label>
            <div className="space-y-2">
              {roleOptions.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    role === r.value
                      ? 'bg-gold/10 border border-gold/30'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={(e) => setRole(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                    role === r.value ? 'border-gold' : 'border-white/30'
                  }`}>
                    {role === r.value && (
                      <div className="w-2 h-2 rounded-full bg-gold" />
                    )}
                  </div>
                  <div>
                    <span className={`font-[family-name:var(--font-display)] text-sm font-semibold ${role === r.value ? 'text-gold' : 'text-white'}`}>
                      {r.label}
                    </span>
                    <p className="text-white/40 text-xs mt-0.5">
                      {r.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
