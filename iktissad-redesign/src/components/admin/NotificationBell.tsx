'use client';

/**
 * NotificationBell — Admin Topbar Component
 * IKTISSAD Design System
 *
 * Supabase Realtime subscription on admin_notifications INSERT events.
 * Dropdown list of last 20 notifications with mark-as-read support.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Bell,
  Users,
  AlertCircle,
  XCircle,
  MessageSquare,
  FileText,
  Settings,
  X,
  AtSign,
  Eye,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { formatRelativeTime } from '@/lib/i18n/format';
import { iconSizes } from '@/lib/design-tokens';
import { createClient } from '@/lib/supabase/client';
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from '@/lib/api-client';

// ─── Types ───────────────────────────────────────────────────────

type NotificationType =
  | 'new_subscriber'
  | 'payment_failed'
  | 'subscription_canceled'
  | 'comment_flagged'
  | 'article_published'
  | 'manual_change'
  | 'editorial_mention'
  | 'review_request';

interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  resource_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'new_subscriber':
      return <Users size={14} className="text-profit" />;
    case 'payment_failed':
      return <AlertCircle size={14} className="text-loss" />;
    case 'subscription_canceled':
      return <XCircle size={14} className="text-orange-400" />;
    case 'comment_flagged':
      return <MessageSquare size={14} className="text-gold" />;
    case 'article_published':
      return <FileText size={14} className="text-blue-400" />;
    case 'manual_change':
      return <Settings size={14} className="text-white/50" />;
    case 'editorial_mention':
      return <AtSign size={14} className="text-gold" />;
    case 'review_request':
      return <Eye size={14} className="text-blue-400" />;
    default:
      return <Bell size={14} className="text-white/50" />;
  }
}

function relativeTime(dateStr: string): string {
  return formatRelativeTime(dateStr, 'ar');
}

function notificationRoute(type: NotificationType, resourceId: string | null): string | null {
  if (!resourceId) return null;
  switch (type) {
    case 'comment_flagged': return `/admin/comments`;
    case 'article_published': return `/admin/articles/${resourceId}`;
    case 'new_subscriber': return `/admin/subscribers/${resourceId}`;
    case 'editorial_mention': return `/admin/articles/${resourceId}`;
    case 'review_request': return `/admin/articles/${resourceId}`;
    default: return null;
  }
}

// ─── Main Component ───────────────────────────────────────────────

interface NotificationBellProps {
  darkMode?: boolean;
}

export default function NotificationBell({ darkMode = true }: NotificationBellProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const json = await getAdminNotifications<AdminNotification>();
      const items: AdminNotification[] = json.data ?? [];
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.is_read).length);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-notifications-bell')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload: { new: AdminNotification }) => {
          const notif = payload.new;
          setNotifications((prev) => [notif, ...prev.slice(0, 19)]);
          setUnreadCount((prev) => prev + 1);

          // Show toast
          const typeKey = notif.type.replace(/_/g, '') as string;
          toast.info(notif.title, {
            description: notif.body ?? undefined,
            icon: getNotificationIcon(notif.type),
          });

          void typeKey; // suppress unused warning
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Mark individual as read
  const markRead = useCallback(async (id: string) => {
    try {
      await markAdminNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  }, []);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    try {
      await markAllAdminNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success(t('admin.notifications.markedAllRead'));
    } catch {
      // Silent fail
    }
  }, [t]);

  // Handle item click
  const handleItemClick = useCallback(
    async (notif: AdminNotification) => {
      if (!notif.is_read) await markRead(notif.id);
      const route = notificationRoute(notif.type, notif.resource_id);
      if (route) {
        router.push(route);
        setOpen(false);
      }
    },
    [markRead, router]
  );

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2.5 rounded-xl transition-all ${
          darkMode
            ? 'bg-white/5 text-white/70 hover:bg-white/10'
            : 'bg-sand text-graphite hover:bg-sand/70'
        }`}
        aria-label={t('admin.notifications.title')}
      >
        <Bell size={iconSizes.md} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-loss text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute start-0 top-full mt-2 w-80 rounded-xl shadow-2xl overflow-hidden z-50 border border-gold/10 bg-midnight"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gold/10">
              <h3 className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">
                {t('admin.notifications.title')}
                {unreadCount > 0 && (
                  <span className="ms-2 text-gold text-xs">({unreadCount})</span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-gold/70 hover:text-gold text-xs font-[family-name:var(--font-display)] transition-colors"
                  >
                    {t('admin.notifications.markAllRead')}
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/30 hover:text-white/70 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-96">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10">
                  <Bell size={32} className="mx-auto text-white/20 mb-3" />
                  <p className="text-white/40 text-sm font-[family-name:var(--font-display)]">
                    {t('admin.notifications.empty')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gold/5">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className={`w-full text-start flex items-start gap-3 p-4 hover:bg-white/5 transition-colors ${
                        !notif.is_read ? 'bg-gold/5' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 text-start">
                        <p className={`text-sm font-[family-name:var(--font-display)] font-semibold leading-tight ${
                          !notif.is_read ? 'text-white' : 'text-white/70'
                        }`}>
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-white/40 text-xs mt-0.5 line-clamp-2 font-[family-name:var(--font-display)]">
                            {notif.body}
                          </p>
                        )}
                        <p className="text-white/25 text-xs mt-1 font-[family-name:var(--font-display)]">
                          {relativeTime(notif.created_at)}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-gold shrink-0 mt-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
