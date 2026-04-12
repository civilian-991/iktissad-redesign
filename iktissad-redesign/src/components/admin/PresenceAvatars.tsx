'use client';

/**
 * PresenceAvatars
 *
 * Renders a stacked row of circular avatars for present users.
 * - Shows up to `maxVisible` overlapping avatars.
 * - Extra users shown as "+N" overflow badge.
 * - Initials fallback when no avatarUrl is provided.
 * - Tooltip listing all names on hover.
 * - Staggered mount animation via motion/react.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { PresenceUser } from '@/hooks/useArticlePresence';

interface PresenceAvatarsProps {
  users: PresenceUser[];
  /** Maximum number of avatars to show before the "+N" badge. Default: 3 */
  maxVisible?: number;
  /** Size of each avatar circle in px. Default: 28 */
  size?: number;
}

/** Extract up to 2 uppercase initials from a display name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Deterministic colour offset so the same user always gets the same hue. */
const AVATAR_COLORS = [
  'bg-gold/30 text-gold',
  'bg-teal/30 text-teal',
  'bg-purple-500/30 text-purple-300',
  'bg-profit/30 text-profit',
  'bg-loss/30 text-loss',
];

function avatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function PresenceAvatars({
  users,
  maxVisible = 3,
  size = 28,
}: PresenceAvatarsProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  if (users.length === 0) return null;

  const visible = users.slice(0, maxVisible);
  const overflow = users.length - maxVisible;
  const allNames = users.map((u) => u.name).join('، ');

  const avatarStyle = {
    width: size,
    height: size,
    fontSize: Math.max(9, Math.round(size * 0.35)),
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setTooltipOpen(true)}
      onMouseLeave={() => setTooltipOpen(false)}
      onFocus={() => setTooltipOpen(true)}
      onBlur={() => setTooltipOpen(false)}
    >
      {/* Stacked avatars */}
      <div className="flex items-center" style={{ direction: 'ltr' }}>
        <AnimatePresence initial={false}>
          {visible.map((user, index) => (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, scale: 0.6, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
              className="relative rounded-full ring-2 ring-midnight overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{
                ...avatarStyle,
                marginLeft: index > 0 ? -Math.round(size * 0.35) : 0,
                zIndex: visible.length - index,
              }}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fall back to initials on broken image
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.setAttribute('data-fallback', 'true');
                    }
                  }}
                />
              ) : (
                <span
                  className={`font-[family-name:var(--font-display)] font-semibold select-none ${avatarColor(user.userId)}`}
                  style={{ fontSize: avatarStyle.fontSize }}
                >
                  {getInitials(user.name)}
                </span>
              )}
            </motion.div>
          ))}

          {/* Overflow badge */}
          {overflow > 0 && (
            <motion.div
              key="overflow"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ delay: visible.length * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
              className="relative rounded-full ring-2 ring-midnight bg-white/10 flex items-center justify-center flex-shrink-0"
              style={{
                ...avatarStyle,
                marginLeft: -Math.round(size * 0.35),
                zIndex: 0,
              }}
            >
              <span
                className="text-white/70 font-[family-name:var(--font-display)] font-semibold select-none"
                style={{ fontSize: avatarStyle.fontSize }}
              >
                +{overflow}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full mb-2 start-0 z-50 px-3 py-2 bg-midnight border border-gold/20 rounded-xl shadow-elevated whitespace-nowrap pointer-events-none"
          >
            <p className="text-white/80 text-xs font-[family-name:var(--font-display)]">
              {allNames}
            </p>
            {/* Arrow */}
            <div className="absolute top-full start-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gold/20" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
