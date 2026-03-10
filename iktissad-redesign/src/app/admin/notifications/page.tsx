/**
 * Admin Notifications Page
 * IKTISSAD Design System
 *
 * Full-page list of all admin notifications (same data as the bell dropdown
 * but paginated and with richer detail). Uses Supabase Realtime for live updates.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  Bell,
  Users,
  AlertCircle,
  XCircle,
  MessageSquare,
  FileText,
  Settings,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

type NotificationType =
  | 'new_subscriber'
  | 'payment_failed'
  | 'subscription_canceled'
  | 'comment_flagged'
  | 'article_published'
  | 'manual_change';

interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  resource_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNotificationIcon(type: NotificationType, size = 18) {
  switch (type) {
    case 'new_subscriber':
      return <Users size={size} className="text-profit" />;
    case 'payment_failed':
      return <AlertCircle size={size} className="text-loss" />;
    case 'subscription_canceled':
      return <XCircle size={size} className="text-orange-400" />;
    case 'comment_flagged':
      return <MessageSquare size={size} className="text-gold" />;
    case 'article_published':
      return <FileText size={size} className="text-blue-400" />;
    case 'manual_change':
      return <Settings size={size} className="text-white/60" />;
    default:
      return <Bell size={size} className="text-white/60" />;
  }
}

function formatTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications(data ?? []);
    } catch {
      // Supabase may not be configured — show empty state
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel('admin-notifications-page')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('postgres_changes' as any, {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        }, (payload: { new: AdminNotification }) => {
          setNotifications((prev) => [payload.new, ...prev]);
        })
        .subscribe();
    } catch {
      // Supabase not configured
    }
    return () => { channel?.unsubscribe(); };
  }, []);

  const markAllRead = async () => {
    try {
      const supabase = createClient();
      const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (ids.length === 0) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('admin_notifications')
        .update({ is_read: true })
        .in('id', ids);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success(t('admin.notifications.markedAllRead'));
    } catch {
      toast.error(t('admin.error'));
    }
  };

  const markOneRead = async (id: string) => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // silent
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div dir="rtl" className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
            {t('admin.notifications.title')}
          </h1>
          {unreadCount > 0 && (
            <p className="text-white/50 text-sm mt-1 font-[family-name:var(--font-display)]">
              {unreadCount} غير مقروء
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-[family-name:var(--font-display)]"
          >
            <RefreshCw size={iconSizes.sm} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 transition-all text-sm font-[family-name:var(--font-display)]"
            >
              <CheckCircle2 size={iconSizes.sm} />
              {t('admin.notifications.markAllRead')}
            </button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="bg-midnight/50 rounded-2xl border border-gold/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={24} className="text-gold animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Bell size={48} className="text-white/20" />
            <p className="text-white/40 font-[family-name:var(--font-display)]">
              {t('admin.notifications.empty')}
            </p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-white/5">
            {notifications.map((notification, i) => (
              <motion.li
                key={notification.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`flex items-start gap-4 p-5 transition-all cursor-default ${
                  !notification.is_read
                    ? 'bg-gold/5 hover:bg-gold/8'
                    : 'hover:bg-white/3'
                }`}
                onClick={() => !notification.is_read && markOneRead(notification.id)}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-[family-name:var(--font-display)] font-semibold leading-snug ${
                    notification.is_read ? 'text-white/60' : 'text-white'
                  }`}>
                    {notification.title}
                  </p>
                  {notification.body && (
                    <p className="text-xs text-white/40 mt-1 font-[family-name:var(--font-display)] leading-relaxed">
                      {notification.body}
                    </p>
                  )}
                  <p className="text-xs text-white/30 mt-2 font-[family-name:var(--font-display)]">
                    {formatTime(notification.created_at)}
                  </p>
                </div>

                {/* Unread dot */}
                {!notification.is_read && (
                  <div className="w-2 h-2 rounded-full bg-gold mt-2 flex-shrink-0" />
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
