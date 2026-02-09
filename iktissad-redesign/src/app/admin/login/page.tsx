"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/handler/sign-in?after_auth_return_to=/admin/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60 font-[family-name:var(--font-display)]">
          جاري التوجيه لتسجيل الدخول...
        </p>
      </div>
    </div>
  );
}
