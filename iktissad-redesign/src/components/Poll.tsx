'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Check, Lock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

interface PollData {
  id: string;
  question: string;
  options: string; // JSON string of string[]
  status: 'active' | 'closed';
  closes_at: string | null;
  created_at: string;
}

interface PollProps {
  articleId: string;
}

const VOTE_COOKIE_PREFIX = 'ikt_poll_';

function getVoterHash(): string {
  if (typeof window === 'undefined') return '';
  let hash = localStorage.getItem('ikt_voter_hash');
  if (!hash) {
    hash = crypto.randomUUID();
    localStorage.setItem('ikt_voter_hash', hash);
  }
  return hash;
}

function hasVotedLocally(pollId: string): number | null {
  if (typeof localStorage === 'undefined') return null;
  const val = localStorage.getItem(`${VOTE_COOKIE_PREFIX}${pollId}`);
  return val !== null ? parseInt(val, 10) : null;
}

function recordVoteLocally(pollId: string, optionIndex: number) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`${VOTE_COOKIE_PREFIX}${pollId}`, String(optionIndex));
}

export default function Poll({ articleId }: PollProps) {
  const { data } = useSWR<ApiResponse<PollData[]>>(
    `/api/polls?articleId=${articleId}`,
    swrFetcher
  );

  const polls = (data?.data ?? []) as unknown as PollData[];
  const activePoll = polls.find((p) => p.status === 'active');

  if (!activePoll) return null;

  return <PollCard poll={activePoll} />;
}

function PollCard({ poll }: { poll: PollData }) {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOption, setVotedOption] = useState<number | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<number, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(false);

  const options: string[] = (() => {
    try {
      return typeof poll.options === 'string'
        ? JSON.parse(poll.options)
        : poll.options;
    } catch {
      return [];
    }
  })();

  const isClosed =
    poll.status === 'closed' ||
    (poll.closes_at && new Date(poll.closes_at) < new Date());

  useEffect(() => {
    const localVote = hasVotedLocally(poll.id);
    if (localVote !== null) {
      setHasVoted(true);
      setVotedOption(localVote);
    }
  }, [poll.id]);

  const submitVote = useCallback(async () => {
    if (selectedOption === null || hasVoted || isClosed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optionIndex: selectedOption,
          voterHash: getVoterHash(),
        }),
      });

      const result = await res.json();

      if (res.ok && result.data) {
        setHasVoted(true);
        setVotedOption(selectedOption);
        setVoteCounts(result.data.counts || {});
        setTotalVotes(result.data.total || 0);
        recordVoteLocally(poll.id, selectedOption);
      } else if (res.status === 409) {
        // Already voted
        setHasVoted(true);
        setVotedOption(selectedOption);
        recordVoteLocally(poll.id, selectedOption);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [selectedOption, hasVoted, isClosed, poll.id]);

  const showResults = hasVoted || !!isClosed;

  return (
    <div className="my-8 border border-sand/60 bg-paper">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 bg-obsidian/[0.03] border-b border-sand/60">
        <BarChart3 size={13} className="text-gold" />
        <span className="text-[11px] font-[family-name:var(--font-display)] font-black text-charcoal/50 uppercase tracking-wider">
          {t('engagement.polls.vote')}
        </span>
        {isClosed && (
          <span className="flex items-center gap-1 text-[10px] text-charcoal/30 ms-auto">
            <Lock size={9} />
            {t('engagement.polls.closed')}
          </span>
        )}
      </div>

      {/* Question */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-[15px] font-[family-name:var(--font-display)] font-bold text-obsidian leading-relaxed">
          {poll.question}
        </p>
      </div>

      {/* Options */}
      <div className="px-5 pb-5 space-y-2.5">
        {options.map((option, idx) => {
          const count = voteCounts[idx] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = selectedOption === idx;
          const isVoted = votedOption === idx;

          return (
            <button
              key={idx}
              onClick={() => {
                if (!showResults && !loading) setSelectedOption(idx);
              }}
              disabled={showResults || loading}
              className={`relative w-full text-start px-4 py-3 text-[13px] font-[family-name:var(--font-display)] transition-all overflow-hidden ${
                showResults
                  ? 'cursor-default border border-sand/60'
                  : isSelected
                    ? 'border-2 border-gold bg-gold/5 font-semibold text-obsidian'
                    : 'border border-sand/60 hover:border-gold/40 text-charcoal/70'
              }`}
            >
              {/* Result bar background */}
              {showResults && (
                <div
                  className="absolute top-0 start-0 bottom-0 bg-gold/10 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              )}

              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {isVoted && <Check size={12} className="text-gold" />}
                  {option}
                </span>
                {showResults && (
                  <span className="text-[12px] font-bold text-charcoal/40 tabular-nums">
                    {pct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {/* Vote button */}
        {!showResults && (
          <button
            onClick={submitVote}
            disabled={selectedOption === null || loading}
            className="w-full mt-2 py-2.5 text-[13px] font-[family-name:var(--font-display)] font-black bg-gold text-obsidian hover:bg-gold-bright disabled:opacity-40 disabled:cursor-not-allowed transition-all rounded-sm"
          >
            {loading ? '...' : t('engagement.polls.vote')}
          </button>
        )}

        {/* Total votes */}
        {showResults && totalVotes > 0 && (
          <p className="text-[11px] text-charcoal/30 font-[family-name:var(--font-display)] pt-1">
            {t('engagement.polls.total_votes')}: {totalVotes}
          </p>
        )}
      </div>
    </div>
  );
}
