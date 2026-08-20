'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, Pause, Play, X, Gauge } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface ListenButtonProps {
  /** The plain-text content to read aloud */
  text: string;
  /** Language for voice selection */
  lang?: 'ar' | 'en';
  /** Article ID for analytics tracking */
  articleId?: string;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

export default function ListenButton({
  text,
  lang = 'ar',
  articleId,
}: ListenButtonProps) {
  const { t } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1); // default 1x
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  // Track progress roughly
  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const interval = setInterval(() => {
      // SpeechSynthesis doesn't provide progress natively;
      // we estimate based on elapsed time and rate
      setProgress((p) => Math.min(p + 0.5, 100));
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, isPaused]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setShowMiniPlayer(false);
    setProgress(0);
    utteranceRef.current = null;
  }, []);

  const trackListen = useCallback(() => {
    if (trackedRef.current || !articleId) return;
    trackedRef.current = true;
    fetch('/api/track/article-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId,
        sessionId: 'tts-' + Date.now(),
        scrollDepth: 100,
        readThrough: true,
      }),
    }).catch(() => {});
  }, [articleId]);

  const play = useCallback(() => {
    if (isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    // Cancel any existing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.rate = SPEED_OPTIONS[speedIdx];

    // Try to find an Arabic voice
    const voices = speechSynthesis.getVoices();
    const langVoice = voices.find(
      (v) => v.lang.startsWith(lang === 'ar' ? 'ar' : 'en') && !v.localService === false
    ) ?? voices.find((v) => v.lang.startsWith(lang === 'ar' ? 'ar' : 'en'));

    if (langVoice) {
      utterance.voice = langVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setShowMiniPlayer(true);
      setProgress(0);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setShowMiniPlayer(false);
      setProgress(100);
      trackListen();
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setShowMiniPlayer(false);
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [text, lang, speedIdx, isPaused, trackListen]);

  const pause = useCallback(() => {
    speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const changeSpeed = useCallback(() => {
    const nextIdx = (speedIdx + 1) % SPEED_OPTIONS.length;
    setSpeedIdx(nextIdx);

    // If currently playing, restart with new speed
    if (isPlaying && utteranceRef.current) {
      const wasPlaying = !isPaused;
      speechSynthesis.cancel();
      if (wasPlaying) {
        // Small delay to allow cancel to process
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
          utterance.rate = SPEED_OPTIONS[nextIdx];

          const voices = speechSynthesis.getVoices();
          const langVoice = voices.find((v) => v.lang.startsWith(lang === 'ar' ? 'ar' : 'en'));
          if (langVoice) utterance.voice = langVoice;

          utterance.onend = () => {
            setIsPlaying(false);
            setShowMiniPlayer(false);
            trackListen();
          };

          utteranceRef.current = utterance;
          speechSynthesis.speak(utterance);
        }, 100);
      }
    }
  }, [speedIdx, isPlaying, isPaused, text, lang, trackListen]);

  if (!isSupported) return null;

  return (
    <>
      {/* Main button */}
      <button
        onClick={isPlaying ? (isPaused ? play : pause) : play}
        className={`flex items-center gap-2 px-3.5 py-2 text-[13px] font-[family-name:var(--font-display)] font-semibold rounded-sm transition-all ${
          isPlaying
            ? 'bg-gold/10 text-gold border border-gold/30'
            : 'border border-sand text-charcoal/50 hover:border-gold/50 hover:text-gold'
        }`}
        title={isPlaying ? t('engagement.tts.pause') : t('engagement.tts.listen')}
      >
        {isPlaying && !isPaused ? (
          <Pause size={13} />
        ) : isPlaying && isPaused ? (
          <Play size={13} />
        ) : (
          <Volume2 size={13} />
        )}
        <span>
          {isPlaying
            ? isPaused
              ? t('engagement.tts.resume')
              : t('engagement.tts.listening')
            : t('engagement.tts.listen')}
        </span>
      </button>

      {/* Sticky mini-player */}
      {showMiniPlayer && (
        <div className="fixed bottom-0 inset-x-0 z-[90] bg-obsidian text-paper shadow-2xl print:hidden">
          {/* Progress bar */}
          <div className="h-0.5 bg-obsidian/50">
            <div
              className="h-full bg-gold transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-2.5 max-w-[1200px] mx-auto">
            {/* Play/Pause */}
            <button
              onClick={isPaused ? play : pause}
              className="w-8 h-8 rounded-full bg-gold text-ink flex items-center justify-center hover:bg-gold-bright transition-colors"
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>

            {/* Label */}
            <span className="flex-1 text-[12px] font-[family-name:var(--font-display)] text-paper/60 truncate">
              {t('engagement.tts.listening')}
            </span>

            {/* Speed control */}
            <button
              onClick={changeSpeed}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-[family-name:var(--font-display)] font-bold text-paper/50 hover:text-gold border border-paper/10 rounded transition-colors"
              title={t('engagement.tts.speed')}
            >
              <Gauge size={10} />
              {SPEED_OPTIONS[speedIdx]}x
            </button>

            {/* Close */}
            <button
              onClick={stop}
              className="w-7 h-7 flex items-center justify-center text-paper/40 hover:text-paper transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
