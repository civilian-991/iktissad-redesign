'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationToggle() {
  const { t } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      // Check if already subscribed
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    setLoading(true);
    try {
      // Register service worker if not already
      const reg = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== 'granted') {
        setLoading(false);
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const subJson = sub.toJSON();
      await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh ?? '',
            auth: subJson.keys?.auth ?? '',
          },
        }),
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error('Push subscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/notifications/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!isSupported) return null;

  // Permission denied — can't show the toggle
  if (permission === 'denied') return null;

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={`flex items-center gap-2 px-3.5 py-2 text-[13px] font-[family-name:var(--font-display)] font-semibold rounded-sm transition-all ${
        isSubscribed
          ? 'bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20'
          : 'bg-obsidian text-paper hover:bg-obsidian/90'
      }`}
      title={isSubscribed ? t('engagement.push.unsubscribe') : t('engagement.push.subscribe')}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isSubscribed ? (
        <BellOff size={14} />
      ) : (
        <Bell size={14} />
      )}
      <span>
        {isSubscribed ? t('engagement.push.subscribed') : t('engagement.push.subscribe')}
      </span>
    </button>
  );
}
