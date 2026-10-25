/** All UI text. The site and its readers are Arabic-only. */
export const t = {
  tabs: { home: 'الرئيسية', sections: 'الأقسام', magazine: 'المجلة', search: 'بحث', more: 'المزيد' },
  home: { latest: 'آخر الأخبار', featured: 'أبرز القصص' },
  common: {
    retry: 'إعادة المحاولة',
    loadError: 'تعذّر تحميل المحتوى. تحقّق من اتصالك بالإنترنت.',
    refreshError: 'تعذّر التحديث. يُعرض المحتوى المحفوظ.',
    empty: 'لا يوجد محتوى بعد.',
    share: 'مشاركة',
    openInBrowser: 'فتح في المتصفح',
    loadingMore: 'جارٍ تحميل المزيد…',
    by: 'بقلم',
  },
  sections: { title: 'الأقسام' },
  search: {
    placeholder: 'ابحث في الأخبار والتقارير',
    prompt: 'اكتب كلمة أو اسم شركة للبحث',
    noResults: 'لا توجد نتائج لـ «{q}». جرّب كلمات أخرى.',
  },
  magazine: {
    title: 'المجلة',
    issue: 'العدد {n}',
    pages: '{n} صفحة',
    page: 'صفحة {n} من {total}',
    noPages: 'لا تتوفر صفحات لهذا العدد.',
  },
  more: {
    title: 'المزيد',
    newsletter: 'النشرة البريدية',
    newsletterBody: 'احصل على أهم أخبار الاقتصاد والأعمال في بريدك.',
    email: 'البريد الإلكتروني',
    subscribe: 'اشترك',
    subscribed: 'تم الاشتراك. تحقّق من بريدك لتأكيد الاشتراك.',
    invalidEmail: 'أدخل بريدًا إلكترونيًا صحيحًا.',
    subscribeError: 'تعذّر الاشتراك. حاول مرة أخرى.',
    about: 'من نحن',
    contact: 'اتصل بنا',
    privacy: 'سياسة الخصوصية',
    terms: 'شروط الاستخدام',
    website: 'زيارة iktissad.com',
    version: 'الإصدار {v}',
  },
  article: { notFound: 'لم يُعثر على المقال.', related: 'اقرأ أيضًا' },
};

export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
