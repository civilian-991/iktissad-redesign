'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
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

const roles = [
  { value: 'admin', label: 'مدير', description: 'صلاحيات كاملة للنظام' },
  { value: 'editor', label: 'محرر', description: 'تعديل ونشر المقالات' },
  { value: 'author', label: 'كاتب', description: 'كتابة وتقديم المقالات' },
  { value: 'contributor', label: 'مساهم', description: 'كتابة المقالات فقط' },
];

const departments = [
  'الإدارة',
  'التحرير',
  'الاقتصاد',
  'الأسواق',
  'الشركات',
  'التكنولوجيا',
  'الطاقة',
  'الرأي',
];

export default function NewUserPage() {
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
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSaving(false);
    window.location.href = '/admin/users';
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
              مستخدم جديد
            </h1>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              إضافة مستخدم جديد للنظام
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !name || !email}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          حفظ المستخدم
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
              المعلومات الأساسية
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  الاسم الكامل <span className="text-loss">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أدخل الاسم الكامل"
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                  />
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  البريد الإلكتروني <span className="text-loss">*</span>
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
                  رقم الهاتف
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
                  القسم
                </label>
                <div className="relative">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors appearance-none"
                  >
                    <option value="" className="bg-midnight">اختر القسم</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept} className="bg-midnight">
                        {dept}
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
              كلمة المرور
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Password */}
              <div>
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  كلمة المرور
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
                  تأكيد كلمة المرور
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
                      className="w-full h-full text-obsidian p-0.5"
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
                  إرسال دعوة بالبريد الإلكتروني
                </span>
                <p className="text-white/40 text-xs">
                  سيتم إرسال رسالة للمستخدم لتعيين كلمة المرور
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
              الصورة الشخصية
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
                  اضغط لرفع صورة
                </span>
                <span className="text-white/30 text-xs mt-1">
                  PNG أو JPG
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
              دور المستخدم
            </label>
            <div className="space-y-2">
              {roles.map((r) => (
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
