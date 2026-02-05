/**
 * Admin Users Page
 * IKTISSAD Design System
 *
 * User management page with search, filters, and bulk actions.
 * Uses design tokens and i18n for internationalization.
 */

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
  Ban
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { Button, Badge, RoleBadge } from '@/components/ui';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const roleKeys = ['all', 'admin', 'editor', 'author', 'contributor'] as const;
const statusKeys = ['all', 'active', 'inactive', 'suspended'] as const;

type RoleKey = typeof roleKeys[number];
type StatusKey = typeof statusKeys[number];
type UserRole = 'admin' | 'editor' | 'author' | 'contributor';
type UserStatus = 'active' | 'inactive' | 'suspended';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: UserStatus;
  articles: number;
  lastActive: string;
  avatar: string;
}

// Mock users data
const mockUsers: UserData[] = [
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

// Stats configuration
interface StatConfig {
  labelKey: 'total' | 'admins' | 'editors' | 'writers';
  value: number;
  icon: typeof Users;
  color: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function UsersPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleKey>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusKey>('all');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  // Stats data
  const statsConfig: StatConfig[] = [
    { labelKey: 'total', value: mockUsers.length, icon: Users, color: 'from-gold to-bronze' },
    { labelKey: 'admins', value: mockUsers.filter(u => u.role === 'admin').length, icon: ShieldAlert, color: 'from-loss to-rose-600' },
    { labelKey: 'editors', value: mockUsers.filter(u => u.role === 'editor').length, icon: ShieldCheck, color: 'from-purple-500 to-indigo-600' },
    { labelKey: 'writers', value: mockUsers.filter(u => u.role === 'author' || u.role === 'contributor').length, icon: User, color: 'from-teal to-emerald-600' },
  ];

  // Get role label from translations
  const getRoleLabel = (role: RoleKey): string => {
    if (role === 'all') return t('admin.articles.filters.all');
    const roleMap: Record<string, string> = {
      admin: t('admin.users.roles.admin'),
      editor: t('admin.users.roles.editor'),
      author: t('admin.users.roles.writer'),
      contributor: t('admin.users.roles.contributor'),
    };
    return roleMap[role] || role;
  };

  // Get status label from translations
  const getStatusLabel = (status: StatusKey): string => {
    if (status === 'all') return t('admin.articles.filters.all');
    return t(`admin.users.status.${status}`);
  };

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch = user.name.includes(searchQuery) || user.email.includes(searchQuery);
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
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

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <ShieldAlert size={iconSizes.sm} className="text-loss" />;
      case 'editor':
        return <ShieldCheck size={iconSizes.sm} className="text-gold" />;
      case 'author':
        return <Shield size={iconSizes.sm} className="text-teal" />;
      default:
        return <User size={iconSizes.sm} className="text-white/50" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return t('common.time.daysAgo', { count: diffDays });
    if (diffHours > 0) return t('common.time.hoursAgo', { count: diffHours });
    return t('common.time.now');
  };

  const activeCount = mockUsers.filter(u => u.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.users.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {mockUsers.length} {t('admin.common.users')} • {activeCount} {t('admin.users.status.active')}
          </p>
        </div>
        <Link href="/admin/users/new">
          <Button variant="primary" size="md" leftIcon={<Plus size={iconSizes.md} />}>
            {t('admin.users.newUser')}
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsConfig.map((stat) => (
          <motion.div
            key={stat.labelKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-midnight/50 border border-gold/10 rounded-xl p-4"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="text-white" size={iconSizes.md} />
            </div>
            <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">
              {t(`admin.users.statsLabels.${stat.labelKey}`)}
            </p>
            <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
              {stat.value}
            </p>
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
              placeholder={t('admin.users.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
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
            <Filter size={iconSizes.md} />
            {t('admin.users.filters.title')}
            <ChevronDown size={iconSizes.sm} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
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
                    {t('admin.users.filters.role')}
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as RoleKey)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {roleKeys.map((role) => (
                      <option key={role} value={role} className="bg-midnight">
                        {getRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    {t('admin.users.filters.status')}
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as StatusKey)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {statusKeys.map((status) => (
                      <option key={status} value={status} className="bg-midnight">
                        {getStatusLabel(status)}
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
              {t('admin.users.bulkActions.selected', { count: selectedUsers.length })}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="success" size="sm">
                {t('admin.users.bulkActions.activate')}
              </Button>
              <Button variant="danger" size="sm">
                {t('admin.users.bulkActions.deactivate')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])}>
                {t('admin.users.bulkActions.deselect')}
              </Button>
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
                  {t('admin.users.table.user')}
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.users.table.role')}
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.users.table.section')}
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.users.table.status')}
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.users.table.articles')}
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.users.table.lastActivity')}
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.users.table.actions')}
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
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm font-medium"
                        >
                          {user.name}
                        </Link>
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
                      {t(`admin.users.status.${user.status}`)}
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
                        <MoreVertical size={iconSizes.md} />
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
                              <Edit size={iconSizes.sm} />
                              {t('admin.users.actions.edit')}
                            </Link>
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-[family-name:var(--font-display)]">
                              <Mail size={iconSizes.sm} />
                              {t('admin.users.actions.sendEmail')}
                            </button>
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-[family-name:var(--font-display)]">
                              <Key size={iconSizes.sm} />
                              {t('admin.users.actions.resetPassword')}
                            </button>
                            <div className="border-t border-gold/10 my-1" />
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-loss hover:bg-loss/10 transition-colors text-sm font-[family-name:var(--font-display)]">
                              <Trash2 size={iconSizes.sm} />
                              {t('admin.users.actions.delete')}
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
            {t('admin.articles.pagination.showing', { from: 1, to: filteredUsers.length, total: mockUsers.length })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              {t('admin.articles.pagination.previous')}
            </Button>
            <Button variant="primary" size="sm">
              1
            </Button>
            <Button variant="ghost" size="sm">
              {t('admin.articles.pagination.next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
