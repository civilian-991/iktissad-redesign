'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "Tajawal, Noto Sans Arabic, sans-serif",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "#faf8f5",
          color: "#1a1a1a",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
          حدث خطأ غير متوقع
        </h1>
        <p style={{ color: "#666", fontSize: "1.125rem" }}>
          نعتذر عن هذا الخطأ. تم إبلاغ الفريق التقني. يرجى المحاولة مرة أخرى.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.75rem 2rem",
            background: "#c9a84c",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          إعادة المحاولة
        </button>
      </body>
    </html>
  );
}
