-- ═══════════════════════════════════════════════════════════════════════════
-- 050 — The 15-باب information architecture
--
-- Editorial renamed the sections and added five that never existed. Slugs are
-- deliberately unchanged for the six renamed sections so no /topics/<slug>
-- URL, redirect, or existing article link breaks; only the display names move.
--
--   الباب التقليدي     الاسم النهائي          slug
--   اقتصاد        →    المشهد الاقتصادي        economy    (unchanged)
--   أسواق         →    نبض الأسواق            markets    (unchanged)
--   شركات         →    عالم الشركات           companies  (unchanged)
--   مجتمع أعمال   →    المجتمع الاقتصادي       society    (unchanged)
--   رأي           →    أقلام                  opinion    (unchanged)
--   ملفات خاصة    →    ملفات                  files      (unchanged)
--   تحليلات       →    عمق                    analysis   (new)
--   أعمال         →    حركة الأعمال            business   (new)
--   شخصيات        →    قيادات                 leaders    (new)
--   مؤشرات        →    بالأرقام               numbers    (new)
--   نشاطات عامة   →    على الساحة              events     (new)
--   فيديو         →    فيديو                  videos     (unchanged)
--
-- The remaining three أبواب are navigation over other taxonomies, not
-- sections: أبرز المواضيع (the homepage), تحت المجهر (the sectors table) and
-- جغرافيا الاقتصاد (countries, grouped by the existing `region` column).
--
-- technology / energy / innovation stay as sections. They are outside the 15
-- but carry 2,176 articles between them, and dropping a section orphans every
-- article filed under it.
-- ═══════════════════════════════════════════════════════════════════════════

update sections set name = 'المشهد الاقتصادي', name_en = 'Economic Landscape' where slug = 'economy';
update sections set name = 'نبض الأسواق',       name_en = 'Market Pulse'       where slug = 'markets';
update sections set name = 'عالم الشركات',      name_en = 'Corporate World'    where slug = 'companies';
update sections set name = 'المجتمع الاقتصادي', name_en = 'Business Community' where slug = 'society';
update sections set name = 'أقلام',             name_en = 'Columns'            where slug = 'opinion';
update sections set name = 'ملفات',             name_en = 'Files'              where slug = 'files';

insert into sections (slug, name, name_en) values
  ('analysis', 'عمق',          'Depth'),
  ('business', 'حركة الأعمال', 'Business Movement'),
  ('leaders',  'قيادات',       'Leaders'),
  ('numbers',  'بالأرقام',     'By the Numbers'),
  ('events',   'على الساحة',   'On the Scene')
on conflict (slug) do nothing;

-- جغرافيا الاقتصاد groups countries by `region` (gulf / mashreq / northafrica /
-- world). Migration 037 left Saudi Arabia and Kuwait in `world`, which put the
-- two largest Gulf economies — 5,658 articles — outside الخليج.
update countries set region = 'gulf' where slug in ('saudi-arabia', 'kuwait');
