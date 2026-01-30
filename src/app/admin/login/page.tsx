'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login - replace with actual auth
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = '/admin/dashboard';
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-obsidian relative overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-gold/20 rounded-full blur-[150px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-navy/50 rounded-full blur-[120px]"
        />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(212, 175, 55, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(212, 175, 55, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [null, '-20%', null],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
            className="absolute w-1 h-1 bg-gold rounded-full"
          />
        ))}
      </div>

      {/* Back to Site */}
      <Link
        href="/"
        className="absolute top-6 right-6 flex items-center gap-2 text-white/60 hover:text-gold transition-colors group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-[family-name:var(--font-display)] text-sm">العودة للموقع</span>
      </Link>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
        className="relative w-full max-w-md mx-4"
      >
        {/* Card Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-gold/20 via-transparent to-gold/20 rounded-2xl blur-xl opacity-50" />

        <div className="relative bg-midnight/80 backdrop-blur-2xl border border-gold/10 rounded-2xl p-8 shadow-dramatic">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gold via-gold-muted to-bronze flex items-center justify-center shadow-gold"
            >
              <span className="text-obsidian font-[family-name:var(--font-display)] font-black text-3xl">إ</span>
            </motion.div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-2">
              تسجيل الدخول
            </h1>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              لوحة إدارة الإقتصاد والأعمال
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@iktissad.com"
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3.5 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/40 transition-colors"
                  required
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
              </div>
            </div>

            {/* Password Field */}
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
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3.5 pr-12 pl-12 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/40 transition-colors"
                  required
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all ${
                    rememberMe
                      ? 'bg-gold border-gold'
                      : 'border-white/20 group-hover:border-white/40'
                  }`}>
                    {rememberMe && (
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
                <span className="text-white/60 text-sm font-[family-name:var(--font-display)]">
                  تذكرني
                </span>
              </label>
              <a href="#" className="text-gold/70 hover:text-gold text-sm font-[family-name:var(--font-display)] transition-colors">
                نسيت كلمة المرور؟
              </a>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full relative overflow-hidden bg-gradient-to-r from-gold via-gold-muted to-gold bg-[length:200%_100%] text-obsidian font-[family-name:var(--font-display)] font-bold py-4 rounded-xl transition-all hover:shadow-gold disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 mx-auto animate-spin" />
              ) : (
                'دخول'
              )}
            </motion.button>
          </form>

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-gold/10">
            <div className="flex items-center gap-3 text-white/40 text-xs">
              <Lock size={14} className="text-gold/50" />
              <span className="font-[family-name:var(--font-display)]">
                اتصال آمن ومشفر بتقنية SSL
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-xs font-[family-name:var(--font-display)]">
        © {new Date().getFullYear()} الإقتصاد والأعمال
      </div>
    </div>
  );
}
