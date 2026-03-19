'use client';

/**
 * ArticlePresenceBadge
 *
 * Renders a compact "currently being edited" indicator for a single article
 * in a list context. Subscribes to Supabase Realtime Presence for the given
 * articleId and shows the avatars of other editors alongside the Arabic label
 * "يعمل عليه الآن".
 *
 * Returns null when no other users are present (zero DOM output, no flicker).
 */

import { motion, AnimatePresence } from 'motion/react';
import { useArticlePresence } from '@/hooks/useArticlePresence';
import PresenceAvatars from '@/components/admin/PresenceAvatars';

interface ArticlePresenceBadgeProps {
  articleId: string;
  currentUser: {
    userId: string;
    name: string;
    avatarUrl?: string;
  } | null;
}

export default function ArticlePresenceBadge({
  articleId,
  currentUser,
}: ArticlePresenceBadgeProps) {
  const { presentUsers } = useArticlePresence({ articleId, currentUser });

  return (
    <AnimatePresence>
      {presentUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="inline-flex items-center gap-1.5"
        >
          {/* Live dot */}
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-profit" />
          </span>

          <span className="text-profit text-[10px] font-[family-name:var(--font-display)] whitespace-nowrap">
            يعمل عليه الآن
          </span>

          <PresenceAvatars users={presentUsers} maxVisible={3} size={22} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
