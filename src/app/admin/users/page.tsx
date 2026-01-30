'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Shield,
  ShieldCheck,
  ShieldAlert,
  User,
  Users,
  ChevronDown,
  Check,
  X,
  Key,
  Ban,
  UserCheck
} from 'lucide-react';

// Mock users data
const mockUsers = [
  {
    id: 1,
    name: 'أحمد المنصور',
    email: 'ahmed@iktissad.com',
    role: 'admin',
    department: 'الإدارة',
    status: 'active',
    articles: 156,
    lastActive: '2024-01-15T10:30:00',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
  },
  {
    id: 2,
    name: 'سارة العلي',
    email: 'sara@iktissad.com',
    role: 'editor',
    department: 'التحرير',
    status: 'active',
    articles: 89,
    lastActive: '2024-01-15T09:15:00',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
  },
  {
    id: 3,
    name: 'محمد الخالدي',
    email: 'mohamed@iktissad.com',
    role: 'author',
    department: 'الأسواق',
    status: 'active',
    articles: 67,
    lastActive: '2024-01-14T16:45:00',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
  {
    id: 4,
    name: 'نور الدين',
    email: 'nour@iktissad.com',
    role: 'author',
    department: 'الشركات',
    status: 'inactive',
    articles: 34,
    lastActive: '2024-01-10T11:20:00',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop',
  },
  {
    id: 5,
    name: 'فاطمة الزهراء',
    email: 'fatima@iktissad.com',
    role: 'contributor',
    department: 'الطاقة',
    status: 'active',
    articles: 23,
    lastActive: '2024-01-15T08:00:00',
    avatar: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=100&h=100&fit=crop',
  },
  {
    id: 6,
    name: 'عمر الشريف',
    email: 'omar@iktissad.com',
    role: 'contributor',
    department: 'الرأي',
    status: 'suspended',
    articles: 12,
    lastActive: '2024-01-05T14:30:00',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
  },
];

const roles = ['الكل', 'admin', 'editor', 'author', 'contributor'];
const statuses = ['الكل', 'active', 'inactive', 'suspended'];

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('الكل');
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch = user.name.includes(searchQuery) || user.email.includes(searchQuery);
    const matchesRole = selectedRole === 'الكل' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'الكل' || user.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleSelectUser = (id: number) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldAlert size={14} className="text-loss" />;
      case 'editor':
        return <ShieldCheck size={14} className="text-gold" />;
      case 'author':
        return <Shield size={14} className="text-teal" />;
      default:
        return <User size={14} className="text-white/50" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'مدير';
      case 'editor':
        return 'محرر';
      case 'author':
        return 'كاتب';
      case 'contributor':
        return 'مساهم';
      default:
        return role;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'inactive':
        return 'غير نشط';
      case 'suspended':
        return 'موقوف';
      default:
        return status;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `منذ ${diffDays} يوم`;
    if (diffHours > 0) return `منذ ${diffHours} ساعة`;
    return 'الآن';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            إدارة المستخدمين
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {mockUsers.length} مستخدم • {mockUsers.filter(u => u.status === 'active').length} نشط
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all"
        >
          <Plus size={18} />
          مستخدم جديد
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المستخدمين', value: mockUsers.length, icon: Users, color: 'from-gold to-bronze' },
          { label: 'المدراء', value: mockUsers.filter(u => u.role === 'admin').length, icon: ShieldAlert, color: 'from-loss to-rose-600' },
          { label: 'المحررون', value: mockUsers.filter(u => u.role === 'editor').length, icon: ShieldCheck, color: 'from-purple-500 to-indigo-600' },
          { label: 'الكتّاب', value: mockUsers.filter(u => u.role === 'author' || u.role === 'contributor').length, icon: User, color: 'from-teal to-emerald-600' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-midnight/50 border border-gold/10 rounded-xl p-4"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="text-white" size={18} />
            </div>
            <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">{stat.label}</p>
            <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="البحث في المستخدمين..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-all font-[family-name:var(--font-display)] text-sm ${
              showFilters
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-white/5 border-gold/10 text-white/70 hover:text-white'
            }`}
          >
            <Filter size={16} />
            الفلاتر
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-gold/10 grid md:grid-cols-2 gap-4">
                {/* Role Filter */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    الدور
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role} className="bg-midnight">
                        {role === 'الكل' ? 'الكل' : getRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    الحالة
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status} className="bg-midnight">
                        {status === 'الكل' ? 'الكل' : getStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gold/10 border border-gold/20 rounded-xl p-4 flex items-center justify-between"
          >
            <span className="text-gold font-[family-name:var(--font-display)] text-sm">
              تم تحديد {selectedUsers.length} مستخدم
            </span>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-profit/10 text-profit rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-profit/20 transition-colors">
                تفعيل
              </button>
              <button className="px-4 py-2 bg-loss/10 text-loss rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-loss/20 transition-colors">
                إيقاف
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="px-4 py-2 bg-white/5 text-white/70 rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-white/10 transition-colors"
              >
                إلغاء التحديد
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/10 bg-white/5">
                <th className="text-right p-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gold/30 bg-transparent checked:bg-gold"
                  />
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  المستخدم
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  الدور
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  القسم
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  الحالة
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  المقالات
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  آخر نشاط
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border-b border-gold/5 hover:bg-white/5 transition-colors ${
                    selectedUsers.includes(user.id) ? 'bg-gold/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="w-4 h-4 rounded border-gold/30 bg-transparent checked:bg-gold"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      <div>
                        <a
                          href={`/admin/users/${user.id}`}
                          className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm font-medium"
                        >
                          {user.name}
                        </a>
                        <p className="text-white/40 text-xs">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-[family-name:var(--font-display)] ${
                      user.role === 'admin'
                        ? 'bg-loss/10 text-loss'
                        : user.role === 'editor'
                          ? 'bg-gold/10 text-gold'
                          : user.role === 'author'
                            ? 'bg-teal/10 text-teal'
                            : 'bg-white/10 text-white/60'
                    }`}>
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="p-4 text-white/70 text-sm font-[family-name:var(--font-display)]">
                    {user.department}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-[family-name:var(--font-display)] ${
                      user.status === 'active'
                        ? 'bg-profit/10 text-profit'
                        : user.status === 'inactive'
                          ? 'bg-white/10 text-white/50'
                          : 'bg-loss/10 text-loss'
                    }`}>
                      {user.status === 'active' ? <Check size={12} /> : user.status === 'suspended' ? <Ban size={12} /> : <X size={12} />}
                      {getStatusLabel(user.status)}
                    </span>
                  </td>
                  <td className="p-4 text-white/70 text-sm font-[family-name:var(--font-display)]">
                    {user.articles}
                  </td>
                  <td className="p-4 text-white/50 text-xs font-[family-name:var(--font-display)]">
                    {getTimeAgo(user.lastActive)}
                  </td>
                  <td className="p-4">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                      <AnimatePresence>
                        {openMenu === user.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute left-0 top-full mt-1 w-44 bg-midnight border border-gold/10 rounded-xl shadow-elevated overflow-hidden z-10"
                          >
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-[family-name:var(--font-display)]"
                            >
                              <Edit size={14} />
                              تعديل
                            </Link>
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-[family-name:var(--font-display)]">
                              <Mail size={14} />
                              إرسال بريد
                            </button>
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-[family-name:var(--font-display)]">
                              <Key size={14} />
                              إعادة تعيين كلمة المرور
                            </button>
                            <div className="border-t border-gold/10 my-1" />
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-loss hover:bg-loss/10 transition-colors text-sm font-[family-name:var(--font-display)]">
                              <Trash2 size={14} />
                              حذف
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gold/10 flex items-center justify-between">
          <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            عرض 1-{filteredUsers.length} من {mockUsers.length}
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-white/5 border border-gold/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm font-[family-name:var(--font-display)]">
              السابق
            </button>
            <button className="px-3 py-1.5 bg-gold text-obsidian rounded-lg text-sm font-[family-name:var(--font-display)] font-semibold">
              1
            </button>
            <button className="px-3 py-1.5 bg-white/5 border border-gold/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm font-[family-name:var(--font-display)]">
              التالي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
