'use client';

import { motion } from 'motion/react';
import { Mail } from 'lucide-react';
import useSWR from 'swr';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import { usersKey, swrFetcher } from '@/lib/api-client';
import type { AdminUser, ApiResponse } from '@/types';

// ─── Role categorisation ────────────────────────────────────────────────────
// AdminUser.role is one of: "admin" | "editor" | "author" | "contributor"
// We map:  admin       → Leadership section
//          editor      → Section Editors section
//          author      → Correspondents section
//          contributor → Correspondents section

function categoriseUsers(users: AdminUser[]) {
  const leadership: AdminUser[] = [];
  const editors: AdminUser[] = [];
  const correspondents: AdminUser[] = [];

  for (const u of users) {
    if (u.role === 'admin') {
      leadership.push(u);
    } else if (u.role === 'editor') {
      editors.push(u);
    } else {
      correspondents.push(u);
    }
  }

  return { leadership, editors, correspondents };
}

// ─── Skeleton helpers ───────────────────────────────────────────────────────

function AvatarSkeleton({ size }: { size: 'lg' | 'sm' }) {
  const dim = size === 'lg' ? 'w-32 h-32' : 'w-20 h-20';
  return (
    <div className={`${dim} rounded-full bg-navy/10 animate-pulse mx-auto`} />
  );
}

function TextSkeleton({ className }: { className?: string }) {
  return <div className={`rounded bg-navy/10 animate-pulse ${className ?? 'h-4 w-24'}`} />;
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-center text-slate/60 py-8 col-span-full">{label}</p>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function TeamPageClient() {
  const { t } = useTranslation();

  const { data: response, isLoading, error } = useSWR<ApiResponse<AdminUser[]>>(
    usersKey({ pageSize: 50, status: 'active' }),
    swrFetcher
  );

  const users = response?.data ?? [];
  const { leadership, editors, correspondents } = categoriseUsers(users);

  // If the API returned an error (e.g. 401 for public visitors) we treat it
  // the same as an empty result — sections will simply show their empty states.
  const fetchFailed = !!error;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">

        {/* ── Hero ── */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-24 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mb-6">
                {t('pages.team.title')}
              </h1>
              <p className="text-xl text-white/80 leading-relaxed">
                {t('pages.team.subtitle')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Leadership ── */}
        <section className="py-20">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                {t('pages.team.leadership')}
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {isLoading ? (
                // Loading skeletons — show 2 placeholders
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-8 shadow-lg">
                    <div className="flex flex-col items-center text-center gap-4">
                      <AvatarSkeleton size="lg" />
                      <TextSkeleton className="h-6 w-40" />
                      <TextSkeleton className="h-4 w-28" />
                    </div>
                  </div>
                ))
              ) : fetchFailed || leadership.length === 0 ? (
                <EmptyState label="لا توجد بيانات متاحة حالياً" />
              ) : (
                leadership.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-8 shadow-lg"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-gold/20 bg-navy/10">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-navy/40 text-4xl font-bold">
                            {member.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-2xl mb-1">
                        {member.name}
                      </h3>
                      <p className="text-gold font-[family-name:var(--font-display)] font-semibold mb-4">
                        {member.department || member.role}
                      </p>
                      {/* Email link — only if available */}
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy hover:bg-gold hover:text-white transition-colors"
                          aria-label={`Email ${member.name}`}
                        >
                          <Mail size={18} />
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ── Section Editors ── */}
        <section className="py-20 bg-ivory">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                {t('pages.team.departments')}
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 text-center shadow-md">
                    <AvatarSkeleton size="sm" />
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <TextSkeleton className="h-5 w-32" />
                      <TextSkeleton className="h-4 w-24" />
                    </div>
                  </div>
                ))
              ) : fetchFailed || editors.length === 0 ? (
                <EmptyState label="لا توجد بيانات متاحة حالياً" />
              ) : (
                editors.map((editor, index) => (
                  <motion.div
                    key={editor.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl p-6 text-center shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 border-4 border-gold/20 bg-navy/10">
                      {editor.avatar ? (
                        <img
                          src={editor.avatar}
                          alt={editor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-navy/40 text-2xl font-bold">
                          {editor.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg">
                      {editor.name}
                    </h3>
                    <p className="text-slate text-sm">{editor.department || editor.role}</p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ── Correspondents (authors & contributors) ── */}
        <section className="py-20">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                المراسلون
              </h2>
              <p className="text-slate">
                شبكة واسعة من المراسلين في جميع أنحاء العالم العربي
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-5 shadow-sm border border-sand">
                    <TextSkeleton className="h-5 w-36 mb-2" />
                    <TextSkeleton className="h-4 w-24" />
                  </div>
                ))
              ) : fetchFailed || correspondents.length === 0 ? (
                <EmptyState label="لا توجد بيانات متاحة حالياً" />
              ) : (
                correspondents.map((correspondent, index) => (
                  <motion.div
                    key={correspondent.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-lg p-5 shadow-sm border border-sand"
                  >
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-navy">
                      {correspondent.name}
                    </h3>
                    {correspondent.department && (
                      <p className="text-slate text-sm">{correspondent.department}</p>
                    )}
                    <p className="text-slate/60 text-xs mt-1 capitalize">{correspondent.role}</p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ── Join Us CTA ── */}
        <section className="py-20 bg-navy text-white">
          <div className="container-luxury text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold mb-4 text-white">
                انضم إلى فريقنا
              </h2>
              <p className="text-white/70 mb-8 max-w-2xl mx-auto">
                نبحث دائماً عن صحفيين ومحررين موهوبين للانضمام إلى فريقنا
              </p>
              <a href="/contact" className="btn-gold inline-block">
                {t('pages.contact.title')}
              </a>
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
