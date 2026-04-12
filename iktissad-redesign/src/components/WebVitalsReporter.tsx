'use client';

import { useEffect } from 'react';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Best-effort: use sendBeacon if available, fall back to fetch
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
  });

  const endpoint = '/api/analytics/web-vitals';

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
  } else {
    fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  }
}

export default function WebVitalsReporter() {
  useEffect(() => {
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }, []);

  return null;
}
