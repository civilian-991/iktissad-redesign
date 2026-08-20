'use client';

/**
 * User Edit Client
 * Full user profile editor with role management, status toggle, and danger zone.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  ArrowRight,
  Save,
  Shield,
  ShieldCheck,
  ShieldAlert,
  User,
  Trash2,
  Loader2,
  Ban,
  CheckCircle,
  Key,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { Button } from '@/components/ui';
import ImageUploader from '@/components/admin/ImageUploader';
import { swrFetcher } from '@/lib/api-client';
import type { AdminUser, ApiResponse } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminRole = 'super_admin' | 'editor' | 'writer' | 'finance' | 'advertiser_manager';

interface AdminRoleData {
  userId: string;
  role: AdminRole;
  permissions: Record<string, unknown>;
  invitedBy: string | null;
  createdAt: string;
}

interface UserEditClientProps {
  userId: string;
}

const ROLE_KEYS: { value: AdminRole; key: string }[] = [
  { value: 'super_admin', key: 'admin.users.edit.roleSuperAdmin' },
  { value: 'editor', key: 'admin.users.edit.roleEditor' },
  { value: 'writer', key: 'admin.users.edit.roleWriter' },
  { value: 'finance', key: 'admin.users.edit.roleFinance' },
  { value: 'advertiser_manager', key: 'admin.users.edit.roleAdvertiserManager' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserEditClient({ userId }: UserEditClientProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // Fetch user data
  const { data: userRes, isLoading: userLoading, mutate: mutateUser } =
    useSWR<ApiResponse<AdminUser>>(`/api/users/${userId}`, swrFetcher, {
      revalidateOnFocus: false,
    });

  // Fetch role data
  const { data: roleRes, isLoading: roleLoading, mutate: mutateRole } =
    useSWR<ApiResponse<AdminRoleData>>(`/api/admin/roles/${userId}`, swrFetcher, {
      revalidateOnFocus: false,
      shouldRetryOnError: false, // 404 is OK — user may not have a role yet
    });

  const user = userRes?.data;
  const adminRole = roleRes?.data;

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended'>('active');

  // Role state
  const [selectedRole, setSelectedRole] = useState<AdminRole>('writer');
  const [permissionsJson, setPermissionsJson] = useState('{}');
  const [permissionsError, setPermissionsError] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isRevokingRole, setIsRevokingRole] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Sync form with fetched user
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || null);
      setStatus(user.status || 'active');
    }
  }, [user]);

  // Sync role form with fetched role
  useEffect(() => {
    if (adminRole) {
      setSelectedRole(adminRole.role);
      setPermissionsJson(JSON.stringify(adminRole.permissions ?? {}, null, 2));
    }
  }, [adminRole]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error(t('admin.users.edit.nameRequired'));
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: phone || undefined,
          avatar: avatar || undefined,
          status,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t('admin.users.edit.saveFailed'));
      }
      toast.success(t('admin.users.edit.profileSaved'));
      mutateUser();
    } catch (err: unknown) {
      toast.error((err as Error).message || t('admin.common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRole = async () => {
    // Validate permissions JSON
    let parsedPermissions: Record<string, unknown> = {};
    try {
      parsedPermissions = JSON.parse(permissionsJson);
      setPermissionsError('');
    } catch {
      setPermissionsError(t('admin.users.edit.invalidPermissionsJson'));
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/roles/${userId}`, {
        method: adminRole ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          adminRole
            ? { role: selectedRole, permissions: parsedPermissions }
            : { userId, role: selectedRole, permissions: parsedPermissions }
        ),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t('admin.users.edit.roleSaveFailed'));
      }
      toast.success(t('admin.users.edit.roleUpdated'));
      mutateRole();
    } catch (err: unknown) {
      toast.error((err as Error).message || t('admin.common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeRole = async () => {
    if (!window.confirm(t('admin.users.edit.revokeConfirm'))) return;
    setIsRevokingRole(true);
    try {
      const res = await fetch(`/api/admin/roles/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t('admin.users.edit.revokeRoleFailed'));
      }
      toast.success(t('admin.users.edit.roleRevoked'));
      mutateRole();
    } catch (err: unknown) {
      toast.error((err as Error).message || t('admin.common.error'));
    } finally {
      setIsRevokingRole(false);
    }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmEmail !== user?.email) {
      toast.error(t('admin.users.edit.emailMismatch'));
      return;
    }
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t('admin.users.edit.deleteUserFailed'));
      }
      toast.success(t('admin.users.edit.userDeleted'));
      router.push('/admin/users');
    } catch (err: unknown) {
      toast.error((err as Error).message || t('admin.common.error'));
    } finally {
      setIsDeletingUser(false);
    }
  };

  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case 'super_admin': return <ShieldAlert size={iconSizes.sm} className="text-loss" />;
      case 'editor': return <ShieldCheck size={iconSizes.sm} className="text-gold" />;
      case 'writer': return <Shield size={iconSizes.sm} className="text-ink" />;
      default: return <User size={iconSizes.sm} className="text-white/50" />;
    }
  }, []);

  const getRoleLabel = (role: AdminRole) => {
    const found = ROLE_KEYS.find((r) => r.value === role);
    return found ? t(found.key) : role;
  };

  const isLoading = userLoading || roleLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gold/50" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-white/50 font-[family-name:var(--font-display)]">
          {t('common.errors.notFound')}
        </p>
        <Link href="/admin/users" className="text-gold hover:underline mt-4 inline-block font-[family-name:var(--font-display)]">
          {t('admin.users.edit.backToList')}
        </Link>
      </div>
    );
  }

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/users"
          className="p-2 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowRight size={iconSizes.lg} />
        </Link>
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
            {t('admin.users.edit.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {user.email}
          </p>
        </div>
      </div>

      {/* User Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-midnight/50 border border-gold/10 rounded-xl p-6"
      >
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            {avatar ? (
              <img src={avatar} alt={user.name} className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold to-bronze flex items-center justify-center">
                <span className="text-ink font-bold text-2xl">{user.name.charAt(0)}</span>
              </div>
            )}
            {adminRole && (
              <div className="absolute -bottom-2 -start-2 w-7 h-7 bg-midnight border border-gold/20 rounded-full flex items-center justify-center">
                {getRoleIcon(adminRole.role)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className="text-xl font-[family-name:var(--font-display)] font-bold text-white">
              {user.name}
            </h2>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              {user.email}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {adminRole ? (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-gold/10 text-gold font-[family-name:var(--font-display)]">
                  {getRoleIcon(adminRole.role)}
                  {getRoleLabel(adminRole.role)}
                </span>
              ) : (
                <span className="text-xs text-white/40 font-[family-name:var(--font-display)]">
                  {t('admin.users.edit.noAdminRole')}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-[family-name:var(--font-display)] ${
                user.status === 'active' ? 'bg-profit/10 text-profit' :
                user.status === 'suspended' ? 'bg-loss/10 text-loss' :
                'bg-white/10 text-white/50'
              }`}>
                {user.status === 'active' ? <CheckCircle size={12} /> : <Ban size={12} />}
                {t(`admin.users.status.${user.status}`)}
              </span>
              <span className="text-xs text-white/30 font-[family-name:var(--font-display)]">
                {t('admin.users.edit.joined')} {joinDate}
              </span>
            </div>
          </div>

          {/* Article count */}
          <div className="text-center hidden md:block">
            <p className="text-3xl font-[family-name:var(--font-display)] font-bold text-white">
              {user.articleCount}
            </p>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
              {t('admin.users.edit.articlesCount')}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile Edit Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-midnight/50 border border-gold/10 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
            {t('admin.users.edit.profile')}
          </h3>

          {/* Name */}
          <div>
            <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-2">
              {t('admin.users.form.fullName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-2">
              {t('admin.users.form.email')}
              <span className="text-white/30 ms-1">({t('admin.users.edit.readOnly')})</span>
            </label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full bg-white/5 border border-gold/5 rounded-xl py-3 px-4 text-white/50 font-[family-name:var(--font-display)] cursor-not-allowed"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-2">
              {t('admin.users.form.phone')}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+966XXXXXXXXX"
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-2">
              {t('admin.users.form.avatar')}
            </label>
            <ImageUploader
              bucket="avatars"
              folder="users"
              currentImage={avatar}
              onUpload={(url) => setAvatar(url)}
              onRemove={() => setAvatar(null)}
              hintText={t('admin.users.edit.dragOrClickUpload')}
              formatHint={t('admin.users.edit.uploadFormatHint')}
            />
          </div>

          {/* Account Status Toggle */}
          <div>
            <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-2">
              {t('admin.users.edit.accountStatus')}
            </label>
            <div className="flex gap-2">
              {(['active', 'inactive', 'suspended'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-[family-name:var(--font-display)] border transition-all ${
                    status === s
                      ? s === 'active'
                        ? 'bg-profit/10 border-profit/30 text-profit'
                        : s === 'suspended'
                          ? 'bg-loss/10 border-loss/30 text-loss'
                          : 'bg-white/10 border-white/20 text-white'
                      : 'bg-white/5 border-gold/10 text-white/40 hover:text-white/70'
                  }`}
                >
                  {t(`admin.users.status.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            className="w-full"
            leftIcon={isSaving ? <Loader2 size={iconSizes.md} className="animate-spin" /> : <Save size={iconSizes.md} />}
            onClick={handleSaveProfile}
            disabled={isSaving}
          >
            {t('admin.users.edit.saveProfile')}
          </Button>
        </motion.div>

        {/* Admin Role Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="bg-midnight/50 border border-gold/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                {t('admin.users.edit.role')}
              </h3>
              {adminRole && (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-gold/10 text-gold font-[family-name:var(--font-display)]">
                  {getRoleIcon(adminRole.role)}
                  {getRoleLabel(adminRole.role)}
                </span>
              )}
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-2">
                {t('admin.users.edit.role')}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
              >
                {ROLE_KEYS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-midnight">
                    {t(opt.key)}
                  </option>
                ))}
              </select>
            </div>

            {/* Permissions JSON */}
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-2">
                {t('admin.users.edit.permissions')}
                <span className="text-white/30 ms-1">(JSON)</span>
              </label>
              <textarea
                value={permissionsJson}
                onChange={(e) => {
                  setPermissionsJson(e.target.value);
                  setPermissionsError('');
                }}
                rows={5}
                className={`w-full bg-white/5 border rounded-xl py-3 px-4 text-white/80 text-sm font-mono placeholder:text-white/30 focus:outline-none transition-colors resize-none ${
                  permissionsError ? 'border-loss/50' : 'border-gold/10 focus:border-gold/30'
                }`}
              />
              {permissionsError && (
                <p className="text-loss text-xs mt-1 font-[family-name:var(--font-display)]">
                  {permissionsError}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                leftIcon={isSaving ? <Loader2 size={iconSizes.md} className="animate-spin" /> : <Key size={iconSizes.md} />}
                onClick={handleSaveRole}
                disabled={isSaving}
              >
                {adminRole ? t('admin.users.edit.updateRole') : t('admin.users.edit.assignRole')}
              </Button>

              {adminRole && (
                <Button
                  variant="danger"
                  size="md"
                  leftIcon={isRevokingRole ? <Loader2 size={iconSizes.sm} className="animate-spin" /> : <Shield size={iconSizes.sm} />}
                  onClick={handleRevokeRole}
                  disabled={isRevokingRole}
                >
                  {t('admin.users.edit.removeRole')}
                </Button>
              )}
            </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-midnight/50 border border-gold/10 rounded-xl p-6">
            <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-3">
              {t('admin.users.edit.subscriptionInfo')}
            </h3>
            <p className="text-white/40 text-sm font-[family-name:var(--font-display)]">
              {t('admin.users.edit.subscriptionHint')}
            </p>
            <Link
              href={`/admin/subscribers?search=${encodeURIComponent(user.email)}`}
              className="inline-flex items-center gap-2 mt-3 text-gold text-sm font-[family-name:var(--font-display)] hover:underline"
            >
              <ExternalLink size={iconSizes.sm} />
              {t('admin.users.edit.searchSubscribers')}
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-loss/5 border border-loss/20 rounded-xl p-6"
      >
        <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-loss mb-2">
          {t('admin.users.edit.deleteUser')}
        </h3>
        <p className="text-white/50 text-sm font-[family-name:var(--font-display)] mb-4">
          {t('admin.users.edit.deleteWarning')}
        </p>

        {!showDeleteModal ? (
          <Button
            variant="danger"
            size="md"
            leftIcon={<Trash2 size={iconSizes.md} />}
            onClick={() => setShowDeleteModal(true)}
          >
            {t('admin.users.edit.deleteUser')}
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-white/70 text-sm font-[family-name:var(--font-display)]">
              {t('admin.users.edit.deleteConfirm')}
              <span className="text-loss font-semibold ms-1">{user.email}</span>
            </p>
            <input
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={user.email}
              className="w-full bg-white/5 border border-loss/30 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/20 focus:outline-none focus:border-loss/50 transition-colors"
            />
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="md"
                leftIcon={isDeletingUser ? <Loader2 size={iconSizes.sm} className="animate-spin" /> : <Trash2 size={iconSizes.sm} />}
                onClick={handleDeleteUser}
                disabled={isDeletingUser || deleteConfirmEmail !== user.email}
              >
                {t('admin.users.edit.confirmDelete')}
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmEmail(''); }}
              >
                {t('common.actions.cancel')}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
