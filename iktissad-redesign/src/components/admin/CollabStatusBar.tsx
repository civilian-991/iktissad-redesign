/**
 * CollabStatusBar — Collaborative editing status indicator
 *
 * Shows:
 * - Connection status (green/orange/red dot with Arabic label)
 * - Avatars of all currently connected editors
 * - "يعمل معك على هذه المقالة: [name1], [name2]" if others are present
 *
 * RTL layout, matches the admin dark design system.
 */

'use client';

import type { AwarenessState } from '@/lib/collab/SupabaseProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CollabStatusBarProps {
  status: 'disconnected' | 'connecting' | 'connected';
  connectedUsers: AwarenessState[];
  className?: string;
}

// ─── User Avatar ─────────────────────────────────────────────────────────────

function UserAvatar({ user }: { user: AwarenessState }) {
  const initials = user.userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      title={user.userName}
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-midnight flex-shrink-0 select-none"
      style={{ backgroundColor: user.color }}
    >
      {initials}
    </div>
  );
}

// ─── Status Dot ──────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: CollabStatusBarProps['status'] }) {
  if (status === 'connected') {
    return (
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
    );
  }
  if (status === 'connecting') {
    return (
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
      </span>
    );
  }
  return (
    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 flex-shrink-0" />
  );
}

// ─── Status Label ────────────────────────────────────────────────────────────

function statusLabel(status: CollabStatusBarProps['status']): string {
  switch (status) {
    case 'connected':   return 'متصل';
    case 'connecting':  return 'جارٍ الاتصال...';
    case 'disconnected': return 'غير متصل';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CollabStatusBar({
  status,
  connectedUsers,
  className = '',
}: CollabStatusBarProps) {
  const hasOthers = connectedUsers.length > 0;

  return (
    <div
      dir="rtl"
      className={`flex items-center gap-3 px-4 py-2 bg-midnight/60 border border-gold/10 rounded-xl text-xs font-[family-name:var(--font-display)] ${className}`}
    >
      {/* Status dot + label */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <StatusDot status={status} />
        <span
          className={
            status === 'connected'
              ? 'text-emerald-400'
              : status === 'connecting'
              ? 'text-amber-400'
              : 'text-red-400'
          }
        >
          {statusLabel(status)}
        </span>
      </div>

      {/* Divider */}
      {hasOthers && <div className="w-px h-3.5 bg-gold/15 flex-shrink-0" />}

      {/* Other editors */}
      {hasOthers && (
        <div className="flex items-center gap-2 min-w-0">
          {/* Avatars */}
          <div className="flex items-center -space-x-1 rtl:space-x-reverse">
            {connectedUsers.slice(0, 5).map((u) => (
              <UserAvatar key={u.userId} user={u} />
            ))}
            {connectedUsers.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-white/10 border border-gold/20 flex items-center justify-center text-[10px] text-white/60 ring-2 ring-midnight flex-shrink-0">
                +{connectedUsers.length - 5}
              </div>
            )}
          </div>

          {/* Label */}
          <span className="text-white/50 truncate hidden sm:block">
            يعمل معك:{' '}
            <span className="text-white/80">
              {connectedUsers
                .slice(0, 3)
                .map((u) => u.userName)
                .join('، ')}
              {connectedUsers.length > 3 && ` و${connectedUsers.length - 3} آخرين`}
            </span>
          </span>
        </div>
      )}

      {/* No others connected */}
      {status === 'connected' && !hasOthers && (
        <span className="text-white/30 hidden sm:block">أنت الوحيد هنا الآن</span>
      )}
    </div>
  );
}
