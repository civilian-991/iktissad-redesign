export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="text-graphite text-sm font-[family-name:var(--font-display)]">جاري التحميل...</p>
      </div>
    </div>
  );
}
