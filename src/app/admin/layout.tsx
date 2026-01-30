'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Image,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  Moon,
  Sun,
  TrendingUp,
  Plus
} from 'lucide-react';

const navigation = [
  { name: 'لوحة التحكم', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'المقالات', href: '/admin/articles', icon: FileText, badge: 12 },
  { name: 'المستخدمين', href: '/admin/users', icon: Users },
  { name: 'المكتبة', href: '/admin/media', icon: Image },
  { name: 'الإعدادات', href: '/admin/settings', icon: Settings },
];

const quickActions = [
  { name: 'مقال جديد', href: '/admin/articles/new', icon: Plus },
  { name: 'مستخدم جديد', href: '/admin/users/new', icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(3);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Skip layout for login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-obsidian' : 'bg-cream'} transition-colors duration-500`}>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: 100 }}
        animate={{ x: 0, width: sidebarOpen ? 280 : 80 }}
        transition={{ type: 'spring', damping: 25 }}
        className={`fixed top-0 right-0 bottom-0 z-40 hidden lg:flex flex-col ${
          darkMode
            ? 'bg-gradient-to-b from-midnight to-obsidian border-l border-gold/10'
            : 'bg-white border-l border-sand'
        }`}
      >
        {/* Logo */}
        <div className={`h-20 flex items-center justify-center border-b ${darkMode ? 'border-gold/10' : 'border-sand'}`}>
          <motion.div
            animate={{ scale: sidebarOpen ? 1 : 0.8 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-gold via-gold-muted to-bronze flex items-center justify-center">
              <span className="text-obsidian font-[family-name:var(--font-display)] font-black text-lg">إ</span>
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden"
                >
                  <span className={`font-[family-name:var(--font-display)] font-bold text-sm whitespace-nowrap ${darkMode ? 'text-white' : 'text-obsidian'}`}>
                    لوحة الإدارة
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative ${
                  isActive
                    ? darkMode
                      ? 'bg-gold/10 text-gold'
                      : 'bg-gold/10 text-gold-muted'
                    : darkMode
                      ? 'text-white/60 hover:text-white hover:bg-white/5'
                      : 'text-graphite hover:text-obsidian hover:bg-sand/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gold rounded-l"
                  />
                )}
                <item.icon size={20} className={isActive ? 'text-gold' : ''} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="font-[family-name:var(--font-display)] font-semibold text-sm whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.badge && sidebarOpen && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mr-auto bg-gold text-obsidian text-xs font-bold px-2 py-0.5 rounded-full"
                  >
                    {item.badge}
                  </motion.span>
                )}
              </Link>
            );
          })}

          {/* Quick Actions */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-6 mt-6 border-t border-gold/10"
              >
                <span className={`text-xs font-[family-name:var(--font-display)] font-semibold px-4 ${darkMode ? 'text-white/40' : 'text-graphite'}`}>
                  إجراءات سريعة
                </span>
                <div className="mt-3 space-y-1">
                  {quickActions.map((action) => (
                    <Link
                      key={action.name}
                      href={action.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                        darkMode
                          ? 'text-gold/70 hover:text-gold hover:bg-gold/5'
                          : 'text-gold-muted hover:text-gold hover:bg-gold/5'
                      }`}
                    >
                      <action.icon size={16} />
                      <span className="font-[family-name:var(--font-display)] text-sm">{action.name}</span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t ${darkMode ? 'border-gold/10' : 'border-sand'}`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
              darkMode
                ? 'text-white/60 hover:text-white hover:bg-white/5'
                : 'text-graphite hover:text-obsidian hover:bg-sand'
            }`}
          >
            <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }}>
              <ChevronDown size={18} className="rotate-90" />
            </motion.div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-[family-name:var(--font-display)]"
                >
                  تصغير القائمة
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className={`transition-all duration-500 ${sidebarOpen ? 'lg:mr-[280px]' : 'lg:mr-20'}`}>
        {/* Top Header */}
        <header className={`sticky top-0 z-30 h-20 flex items-center justify-between px-6 ${
          darkMode
            ? 'bg-obsidian/80 backdrop-blur-xl border-b border-gold/10'
            : 'bg-white/80 backdrop-blur-xl border-b border-sand'
        }`}>
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`lg:hidden p-2 rounded-lg ${darkMode ? 'text-white' : 'text-obsidian'}`}
          >
            <Menu size={24} />
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-4">
            <div className={`relative ${searchOpen ? 'w-full' : 'w-12 lg:w-full'} transition-all`}>
              <input
                type="text"
                placeholder="بحث في لوحة التحكم..."
                className={`w-full py-2.5 pr-12 pl-4 rounded-xl font-[family-name:var(--font-display)] text-sm transition-all ${
                  darkMode
                    ? 'bg-white/5 border border-gold/10 text-white placeholder:text-white/40 focus:border-gold/30'
                    : 'bg-sand/50 border border-sand text-obsidian placeholder:text-graphite focus:border-gold'
                } focus:outline-none`}
              />
              <Search className={`absolute right-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white/40' : 'text-graphite'}`} size={18} />
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            {/* Time */}
            <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg ${
              darkMode ? 'bg-white/5' : 'bg-sand/50'
            }`}>
              <TrendingUp size={16} className="text-profit" />
              <span className={`font-[family-name:var(--font-accent)] text-sm ${darkMode ? 'text-white/70' : 'text-graphite'}`}>
                {currentTime}
              </span>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl transition-all ${
                darkMode
                  ? 'bg-white/5 text-gold hover:bg-white/10'
                  : 'bg-sand text-obsidian hover:bg-sand/70'
              }`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <button className={`relative p-2.5 rounded-xl transition-all ${
              darkMode
                ? 'bg-white/5 text-white/70 hover:bg-white/10'
                : 'bg-sand text-graphite hover:bg-sand/70'
            }`}>
              <Bell size={18} />
              {notifications > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 bg-loss text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-3 p-2 pr-3 rounded-xl transition-all ${
                  darkMode
                    ? 'bg-white/5 hover:bg-white/10'
                    : 'bg-sand hover:bg-sand/70'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-bronze flex items-center justify-center">
                  <span className="text-obsidian font-bold text-sm">م</span>
                </div>
                <div className="hidden md:block text-right">
                  <p className={`text-sm font-[family-name:var(--font-display)] font-semibold ${darkMode ? 'text-white' : 'text-obsidian'}`}>
                    مدير النظام
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-white/50' : 'text-graphite'}`}>
                    admin@iktissad.com
                  </p>
                </div>
                <ChevronDown size={16} className={darkMode ? 'text-white/50' : 'text-graphite'} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`absolute left-0 top-full mt-2 w-56 rounded-xl overflow-hidden shadow-elevated ${
                      darkMode ? 'bg-midnight border border-gold/10' : 'bg-white border border-sand'
                    }`}
                  >
                    <div className={`p-4 border-b ${darkMode ? 'border-gold/10' : 'border-sand'}`}>
                      <p className={`font-[family-name:var(--font-display)] font-semibold ${darkMode ? 'text-white' : 'text-obsidian'}`}>
                        مدير النظام
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-white/50' : 'text-graphite'}`}>
                        صلاحيات كاملة
                      </p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/admin/settings"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                          darkMode
                            ? 'text-white/70 hover:text-white hover:bg-white/5'
                            : 'text-graphite hover:text-obsidian hover:bg-sand/50'
                        }`}
                      >
                        <Settings size={16} />
                        <span className="font-[family-name:var(--font-display)] text-sm">الإعدادات</span>
                      </Link>
                      <button
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                          darkMode
                            ? 'text-loss hover:bg-loss/10'
                            : 'text-loss hover:bg-loss/10'
                        }`}
                      >
                        <LogOut size={16} />
                        <span className="font-[family-name:var(--font-display)] text-sm">تسجيل الخروج</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className={`fixed top-0 right-0 bottom-0 w-80 z-50 lg:hidden ${
                darkMode
                  ? 'bg-gradient-to-b from-midnight to-obsidian'
                  : 'bg-white'
              }`}
            >
              <div className={`h-20 flex items-center justify-between px-6 border-b ${darkMode ? 'border-gold/10' : 'border-sand'}`}>
                <span className={`font-[family-name:var(--font-display)] font-bold ${darkMode ? 'text-white' : 'text-obsidian'}`}>
                  القائمة
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'text-white/70 hover:text-white' : 'text-graphite hover:text-obsidian'}`}
                >
                  <X size={24} />
                </button>
              </div>
              <nav className="p-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-gold/10 text-gold'
                          : darkMode
                            ? 'text-white/60 hover:text-white hover:bg-white/5'
                            : 'text-graphite hover:text-obsidian hover:bg-sand/50'
                      }`}
                    >
                      <item.icon size={20} />
                      <span className="font-[family-name:var(--font-display)] font-semibold">{item.name}</span>
                      {item.badge && (
                        <span className="mr-auto bg-gold text-obsidian text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
