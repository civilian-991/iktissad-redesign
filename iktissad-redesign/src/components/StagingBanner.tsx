"use client";

const env = process.env.NEXT_PUBLIC_APP_ENV;

export default function StagingBanner() {
  if (env === "production" || !env || env === "development") return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] bg-amber-500 text-white text-center text-sm font-bold py-1 pointer-events-none select-none uppercase tracking-wide">
      {env} environment
    </div>
  );
}
