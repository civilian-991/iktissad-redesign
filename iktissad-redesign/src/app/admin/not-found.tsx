import { FileQuestion, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-obsidian/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-10 h-10 text-ink" />
        </div>
        <h1 className="text-6xl font-[family-name:var(--font-display)] font-black text-ink mb-4">404</h1>
        <h2 className="text-xl font-[family-name:var(--font-display)] font-bold text-ink mb-3">
          الصفحة غير موجودة
        </h2>
        <p className="text-graphite mb-8 font-[family-name:var(--font-display)]">
          عذراً، صفحة لوحة التحكم التي تبحث عنها غير موجودة
        </p>
        <Link href="/admin/dashboard" className="btn-gold inline-flex items-center gap-2">
          <span>العودة للوحة التحكم</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
