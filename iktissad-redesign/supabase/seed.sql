-- ============================================================================
-- IKTISSAD CMS Seed Data
-- Run after schema.sql to populate initial data.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────
-- SECTIONS
-- ──────────────────────────────────────────────────────────────

INSERT INTO sections (id, slug, name, name_en, description, description_en) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'economics',  'اقتصاد',     'Economics',   'أخبار وتحليلات اقتصادية شاملة تغطي الأسواق العربية والعالمية',           'Comprehensive economic news and analysis covering Arab and global markets'),
  ('a0000000-0000-0000-0000-000000000002', 'technology', 'تكنولوجيا',  'Technology',  'آخر المستجدات في عالم التكنولوجيا والتحول الرقمي في المنطقة العربية',    'Latest developments in technology and digital transformation in the Arab region'),
  ('a0000000-0000-0000-0000-000000000003', 'investment', 'استثمار',     'Investment',  'فرص الاستثمار والتحليلات المالية وأخبار الأسواق والبورصات',                'Investment opportunities, financial analysis, and stock market news'),
  ('a0000000-0000-0000-0000-000000000004', 'markets',    'أسواق',      'Markets',     'تغطية شاملة لأسواق المال والبورصات العربية والعالمية',                     'Comprehensive coverage of Arab and global financial markets'),
  ('a0000000-0000-0000-0000-000000000005', 'companies',  'شركات',      'Companies',   'أخبار الشركات والمؤسسات الاقتصادية الكبرى في المنطقة العربية',             'News about major companies and economic institutions in the Arab region'),
  ('a0000000-0000-0000-0000-000000000006', 'energy',     'طاقة',       'Energy',      'أخبار وتحليلات قطاع الطاقة والنفط والغاز والطاقة المتجددة',              'Energy, oil, gas, and renewable energy news and analysis');

-- ──────────────────────────────────────────────────────────────
-- SECTORS
-- ──────────────────────────────────────────────────────────────

INSERT INTO sectors (id, slug, name, name_en, description, description_en, icon, color) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'oil-gas',     'النفط والغاز',              'Oil & Gas',                    'تغطية شاملة لقطاع النفط والغاز في المنطقة العربية والأسواق العالمية',       'Comprehensive coverage of the oil and gas sector in the Arab region and global markets',      'Fuel',       '#F59E0B'),
  ('b0000000-0000-0000-0000-000000000002', 'banking',     'البنوك والخدمات المالية',   'Banking & Financial Services', 'أخبار وتحليلات القطاع المصرفي والخدمات المالية في العالم العربي',            'News and analysis of the banking sector and financial services in the Arab world',            'Landmark',   '#3B82F6'),
  ('b0000000-0000-0000-0000-000000000003', 'energy',      'الطاقة المتجددة',           'Renewable Energy',             'مستجدات قطاع الطاقة المتجددة والاستدامة في المنطقة',                         'Updates on the renewable energy and sustainability sector in the region',                     'Zap',        '#10B981'),
  ('b0000000-0000-0000-0000-000000000004', 'technology',  'التكنولوجيا',               'Technology',                   'ابتكارات التكنولوجيا والتحول الرقمي في العالم العربي',                       'Technology innovation and digital transformation in the Arab world',                          'Cpu',        '#8B5CF6'),
  ('b0000000-0000-0000-0000-000000000005', 'aviation',    'الطيران',                   'Aviation',                     'أخبار وتحليلات قطاع الطيران والنقل الجوي في المنطقة',                       'Aviation and air transport news and analysis in the region',                                  'Plane',      '#06B6D4'),
  ('b0000000-0000-0000-0000-000000000006', 'real-estate', 'العقارات',                  'Real Estate',                  'أخبار سوق العقارات والتطوير العمراني في العالم العربي',                      'Real estate market and urban development news in the Arab world',                             'Building2',  '#EC4899');

-- ──────────────────────────────────────────────────────────────
-- COUNTRIES
-- ──────────────────────────────────────────────────────────────

INSERT INTO countries (id, slug, name, name_en, flag, economic_overview, economic_overview_en, key_indicators) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'saudi-arabia',
    'المملكة العربية السعودية', 'Saudi Arabia', '🇸🇦',
    'تعد المملكة العربية السعودية أكبر اقتصاد في منطقة الشرق الأوسط وشمال أفريقيا وعضو فاعل في مجموعة العشرين',
    'Saudi Arabia is the largest economy in the MENA region and an active member of the G20',
    '{"gdp": "1.1 trillion USD", "gdpGrowth": "3.5%", "inflation": "2.1%", "population": "36 million", "unemployment": "4.8%"}'::jsonb
  ),
  ('c0000000-0000-0000-0000-000000000002', 'uae',
    'الإمارات العربية المتحدة', 'United Arab Emirates', '🇦🇪',
    'اقتصاد متنوع يعتمد على السياحة والتجارة والخدمات المالية إلى جانب النفط والغاز',
    'A diversified economy relying on tourism, trade, and financial services alongside oil and gas',
    '{"gdp": "507 billion USD", "gdpGrowth": "4.2%", "inflation": "1.8%", "population": "10 million", "unemployment": "2.9%"}'::jsonb
  ),
  ('c0000000-0000-0000-0000-000000000003', 'egypt',
    'جمهورية مصر العربية', 'Egypt', '🇪🇬',
    'أكبر اقتصاد في شمال أفريقيا من حيث عدد السكان ويشهد إصلاحات اقتصادية واسعة',
    'The largest economy in North Africa by population, undergoing extensive economic reforms',
    '{"gdp": "476 billion USD", "gdpGrowth": "4.0%", "inflation": "14.5%", "population": "105 million", "unemployment": "7.1%"}'::jsonb
  ),
  ('c0000000-0000-0000-0000-000000000004', 'kuwait',
    'دولة الكويت', 'Kuwait', '🇰🇼',
    'اقتصاد غني بالنفط يسعى للتنويع من خلال رؤية كويت جديدة 2035',
    'An oil-rich economy seeking diversification through New Kuwait Vision 2035',
    '{"gdp": "184 billion USD", "gdpGrowth": "2.8%", "inflation": "3.5%", "population": "4.3 million", "unemployment": "2.2%"}'::jsonb
  ),
  ('c0000000-0000-0000-0000-000000000005', 'lebanon',
    'الجمهورية اللبنانية', 'Lebanon', '🇱🇧',
    'اقتصاد يمر بمرحلة إعادة هيكلة بعد الأزمة المالية ويعتمد على قطاع الخدمات والتحويلات',
    'An economy undergoing restructuring after the financial crisis, relying on services and remittances',
    '{"gdp": "23 billion USD", "gdpGrowth": "-0.5%", "inflation": "171%", "population": "5.5 million", "unemployment": "29.6%"}'::jsonb
  );

-- ──────────────────────────────────────────────────────────────
-- USERS (CMS admin users)
-- ──────────────────────────────────────────────────────────────

INSERT INTO users (id, email, name, role, avatar, department, status, article_count, last_active, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'admin@iktissad.com',   'محمد العلي',    'admin',       '/images/users/admin.jpg',   'الإدارة',  'active',    156, '2024-01-15T10:30:00Z', '2024-01-15T10:00:00Z'),
  ('d0000000-0000-0000-0000-000000000002', 'editor@iktissad.com',  'سارة الحسن',    'editor',      '/images/users/editor.jpg',  'التحرير',  'active',    89,  '2024-01-15T09:15:00Z', '2024-03-20T08:00:00Z'),
  ('d0000000-0000-0000-0000-000000000003', 'author@iktissad.com',  'خالد المنصور',  'author',      '/images/users/author.jpg',  'الأسواق',  'active',    67,  '2024-01-14T16:45:00Z', '2024-06-10T14:00:00Z'),
  ('d0000000-0000-0000-0000-000000000004', 'nour@iktissad.com',    'نور الدين',     'author',      '',                           'الشركات',  'inactive',  34,  '2024-01-10T11:20:00Z', '2024-07-01T09:00:00Z'),
  ('d0000000-0000-0000-0000-000000000005', 'fatima@iktissad.com',  'فاطمة الزهراء', 'contributor', '',                           'الطاقة',   'active',    23,  '2024-01-15T08:00:00Z', '2024-08-15T12:00:00Z'),
  ('d0000000-0000-0000-0000-000000000006', 'omar@iktissad.com',    'عمر الشريف',    'contributor', '',                           'الرأي',    'suspended', 12,  '2024-01-05T14:30:00Z', '2024-09-01T10:00:00Z');

-- ──────────────────────────────────────────────────────────────
-- ARTICLES
-- ──────────────────────────────────────────────────────────────

INSERT INTO articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, featured_image, section_id, sector_id, country_id, author_id, tags, status, views, published_at, created_at, updated_at) VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'saudi-economy-q3-growth',
    'الاقتصاد السعودي يحقق نمواً بنسبة 3.5% في الربع الثالث',
    'Saudi Economy Achieves 3.5% Growth in Q3',
    'حقق الاقتصاد السعودي نمواً ملحوظاً في الربع الثالث مدفوعاً بالقطاعات غير النفطية',
    'Saudi economy achieves notable growth in Q3 driven by non-oil sectors',
    '<p>تفاصيل المقال الكامل هنا...</p>',
    '<p>Full article content here...</p>',
    '/images/articles/saudi-economy.jpg',
    'a0000000-0000-0000-0000-000000000001',  -- economics
    'b0000000-0000-0000-0000-000000000001',  -- oil-gas
    'c0000000-0000-0000-0000-000000000001',  -- saudi-arabia
    'd0000000-0000-0000-0000-000000000001',  -- admin user
    ARRAY['اقتصاد', 'السعودية', 'نمو'],
    'published', 12540,
    '2025-11-15T08:00:00Z', '2025-11-14T10:30:00Z', '2025-11-15T08:00:00Z'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'uae-ai-strategy-2025',
    'الإمارات تطلق استراتيجية جديدة للذكاء الاصطناعي',
    'UAE Launches New AI Strategy',
    'أعلنت دولة الإمارات عن استراتيجية شاملة لتعزيز استخدام الذكاء الاصطناعي في القطاعات الحكومية والخاصة',
    'The UAE announces a comprehensive strategy to enhance AI use in public and private sectors',
    '<p>تفاصيل المقال الكامل هنا...</p>',
    '<p>Full article content here...</p>',
    '/images/articles/uae-ai.jpg',
    'a0000000-0000-0000-0000-000000000002',  -- technology
    'b0000000-0000-0000-0000-000000000004',  -- technology sector
    'c0000000-0000-0000-0000-000000000002',  -- uae
    'd0000000-0000-0000-0000-000000000002',  -- editor user
    ARRAY['تكنولوجيا', 'الإمارات', 'ذكاء اصطناعي'],
    'published', 8320,
    '2025-11-12T10:00:00Z', '2025-11-11T14:00:00Z', '2025-11-12T10:00:00Z'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'egypt-foreign-investment-2025',
    'مصر تستقطب استثمارات أجنبية بقيمة 10 مليارات دولار',
    'Egypt Attracts $10 Billion in Foreign Investment',
    'نجحت مصر في استقطاب استثمارات أجنبية ضخمة في قطاعات البنية التحتية والطاقة المتجددة',
    'Egypt successfully attracts massive foreign investments in infrastructure and renewable energy sectors',
    '<p>تفاصيل المقال الكامل هنا...</p>',
    '<p>Full article content here...</p>',
    '/images/articles/egypt-investment.jpg',
    'a0000000-0000-0000-0000-000000000003',  -- investment
    'b0000000-0000-0000-0000-000000000003',  -- energy
    'c0000000-0000-0000-0000-000000000003',  -- egypt
    'd0000000-0000-0000-0000-000000000003',  -- author user
    ARRAY['استثمار', 'مصر', 'طاقة متجددة'],
    'published', 6750,
    '2025-11-10T12:00:00Z', '2025-11-09T09:00:00Z', '2025-11-10T12:00:00Z'
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'central-bank-measures',
    'البنك المركزي يعلن عن إجراءات جديدة لدعم الاقتصاد',
    'Central Bank Announces New Measures to Support the Economy',
    'أعلن البنك المركزي عن حزمة من الإجراءات الجديدة التي تهدف إلى دعم النمو الاقتصادي',
    'The central bank announces a package of new measures aimed at supporting economic growth',
    '<p>تفاصيل المقال الكامل هنا...</p>',
    '<p>Full article content here...</p>',
    '/images/articles/central-bank.jpg',
    'a0000000-0000-0000-0000-000000000001',  -- economics
    'b0000000-0000-0000-0000-000000000002',  -- banking
    'c0000000-0000-0000-0000-000000000001',  -- saudi-arabia
    'd0000000-0000-0000-0000-000000000001',
    ARRAY['بنوك', 'سياسة نقدية'],
    'published', 12500,
    '2024-01-15T08:00:00Z', '2024-01-14T10:00:00Z', '2024-01-15T08:00:00Z'
  ),
  (
    'e0000000-0000-0000-0000-000000000005',
    'stock-market-rise',
    'ارتفاع مؤشرات البورصة مع تزايد ثقة المستثمرين',
    'Stock Market Indices Rise as Investor Confidence Grows',
    'شهدت البورصة ارتفاعاً ملحوظاً في مؤشراتها الرئيسية',
    'The stock market saw a notable rise in its main indices',
    '<p>تفاصيل المقال الكامل هنا...</p>',
    '<p>Full article content here...</p>',
    '/images/articles/stock-market.jpg',
    'a0000000-0000-0000-0000-000000000004',  -- markets
    'b0000000-0000-0000-0000-000000000002',  -- banking
    'c0000000-0000-0000-0000-000000000002',  -- uae
    'd0000000-0000-0000-0000-000000000002',
    ARRAY['أسواق', 'بورصة'],
    'published', 8900,
    '2024-01-15T10:00:00Z', '2024-01-14T12:00:00Z', '2024-01-15T10:00:00Z'
  ),
  (
    'e0000000-0000-0000-0000-000000000006',
    'tech-sector-growth',
    'قطاع التكنولوجيا يقود النمو في الربع الأخير',
    'Technology Sector Leads Growth in Last Quarter',
    'حقق قطاع التكنولوجيا نمواً استثنائياً خلال الربع الأخير من العام',
    'The technology sector achieved exceptional growth during the last quarter of the year',
    '<p>تفاصيل المقال الكامل هنا...</p>',
    '<p>Full article content here...</p>',
    '/images/articles/tech-sector.jpg',
    'a0000000-0000-0000-0000-000000000002',  -- technology
    'b0000000-0000-0000-0000-000000000004',  -- technology sector
    'c0000000-0000-0000-0000-000000000002',  -- uae
    'd0000000-0000-0000-0000-000000000003',
    ARRAY['تكنولوجيا', 'نمو'],
    'draft', 0,
    NULL, '2024-01-14T09:00:00Z', '2024-01-14T09:00:00Z'
  );

-- ──────────────────────────────────────────────────────────────
-- MAGAZINE ISSUES
-- ──────────────────────────────────────────────────────────────

INSERT INTO magazine_issues (id, issue_number, title, title_en, subtitle, cover_image, publish_date, pdf_url, pages, views, downloads, featured, status, highlights) VALUES
  ('f0000000-0000-0000-0000-000000000001', 543, 'العدد 543', 'Issue 543', 'فبراير 2026',
    '/images/magazines/issue-543-cover.jpg', '2026-02-01T00:00:00Z', '/magazines/issue-543.pdf',
    80, 0, 0, false, 'draft',
    ARRAY['قمة دافوس 2026', 'الذكاء الاصطناعي في الاقتصاد']
  ),
  ('f0000000-0000-0000-0000-000000000002', 542, 'العدد 542', 'Issue 542', 'يناير 2026',
    '/images/magazines/issue-542-cover.jpg', '2026-01-01T00:00:00Z', '/magazines/issue-542.pdf',
    84, 12500, 3200, true, 'published',
    ARRAY['توقعات الاقتصاد العربي 2026', 'مقابلة حصرية مع وزير المالية السعودي', 'ملف خاص: مستقبل التقنية المالية']
  ),
  ('f0000000-0000-0000-0000-000000000003', 541, 'العدد 541', 'Issue 541', 'ديسمبر 2025',
    '/images/magazines/issue-541-cover.jpg', '2025-12-01T00:00:00Z', '/magazines/issue-541.pdf',
    78, 15200, 4100, false, 'published',
    ARRAY['أفضل 100 شركة عربية', 'قمة المناخ وتأثيرها على الاقتصاد']
  ),
  ('f0000000-0000-0000-0000-000000000004', 540, 'العدد 540', 'Issue 540', 'نوفمبر 2025',
    '/images/magazines/issue-540-cover.jpg', '2025-11-01T00:00:00Z', '/magazines/issue-540.pdf',
    72, 11800, 2900, false, 'published',
    ARRAY['الاستثمار في العقارات', 'أسواق الخليج']
  ),
  ('f0000000-0000-0000-0000-000000000005', 539, 'العدد 539', 'Issue 539', 'أكتوبر 2025',
    '/images/magazines/issue-539-cover.jpg', '2025-10-01T00:00:00Z', '/magazines/issue-539.pdf',
    80, 13400, 3500, false, 'published',
    ARRAY['مؤتمر صندوق النقد الدولي', 'البنوك المركزية العربية']
  ),
  ('f0000000-0000-0000-0000-000000000006', 538, 'العدد 538', 'Issue 538', 'سبتمبر 2025',
    '/images/magazines/issue-538-cover.jpg', '2025-09-01T00:00:00Z', '/magazines/issue-538.pdf',
    76, 10200, 2600, false, 'published',
    ARRAY['الطاقة المتجددة', 'رؤية 2030']
  );

-- ──────────────────────────────────────────────────────────────
-- PROFILES
-- ──────────────────────────────────────────────────────────────

INSERT INTO profiles (id, name, name_en, description, description_en, logo, sector_id, country_id, website, founded, type) VALUES
  ('10000000-0000-0000-0000-000000000001', 'أرامكو السعودية', 'Saudi Aramco',
    'أكبر شركة نفط في العالم ومن أكثر الشركات قيمة سوقية على مستوى العالم',
    'The world''s largest oil company and one of the most valuable companies globally',
    '/images/profiles/aramco-logo.png',
    'b0000000-0000-0000-0000-000000000001',  -- oil-gas
    'c0000000-0000-0000-0000-000000000001',  -- saudi-arabia
    'https://www.aramco.com', '1933', 'corporation'
  ),
  ('10000000-0000-0000-0000-000000000002', 'طيران الإمارات', 'Emirates Airlines',
    'شركة طيران دولية مقرها دبي وتعد من أكبر شركات الطيران في العالم',
    'An international airline based in Dubai, one of the largest airlines in the world',
    '/images/profiles/emirates-logo.png',
    'b0000000-0000-0000-0000-000000000005',  -- aviation
    'c0000000-0000-0000-0000-000000000002',  -- uae
    'https://www.emirates.com', '1985', 'corporation'
  ),
  ('10000000-0000-0000-0000-000000000003', 'البنك المركزي المصري', 'Central Bank of Egypt',
    'الهيئة الرقابية المسؤولة عن السياسة النقدية والإشراف على القطاع المصرفي في مصر',
    'The regulatory body responsible for monetary policy and banking sector supervision in Egypt',
    '/images/profiles/cbe-logo.png',
    'b0000000-0000-0000-0000-000000000002',  -- banking
    'c0000000-0000-0000-0000-000000000003',  -- egypt
    'https://www.cbe.org.eg', '1961', 'government'
  );

-- ──────────────────────────────────────────────────────────────
-- MEDIA
-- ──────────────────────────────────────────────────────────────

INSERT INTO media (id, url, filename, mime_type, size, alt, alt_en, folder, uploaded_by, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001', '/uploads/2025/11/saudi-economy-banner.jpg',       'saudi-economy-banner.jpg',       'image/jpeg', 245000,  'لافتة الاقتصاد السعودي',                    'Saudi economy banner',             'مقالات', 'd0000000-0000-0000-0000-000000000001', '2025-11-14T10:30:00Z'),
  ('20000000-0000-0000-0000-000000000002', '/uploads/2025/11/uae-ai-strategy.png',            'uae-ai-strategy.png',            'image/png',  382000,  'استراتيجية الإمارات للذكاء الاصطناعي',       'UAE AI strategy illustration',     'مقالات', 'd0000000-0000-0000-0000-000000000002', '2025-11-11T14:00:00Z'),
  ('20000000-0000-0000-0000-000000000003', '/uploads/2025/11/egypt-investment-infographic.jpg','egypt-investment-infographic.jpg','image/jpeg', 198000,  'إنفوجرافيك استثمارات مصر',                   'Egypt investment infographic',     'مقالات', 'd0000000-0000-0000-0000-000000000001', '2025-11-09T09:00:00Z'),
  ('20000000-0000-0000-0000-000000000004', '/uploads/2024/01/hero-banner.jpg',                'hero-banner.jpg',                'image/jpeg', 2400000, 'لافتة رئيسية',                              'Hero banner',                      'مقالات', 'd0000000-0000-0000-0000-000000000001', '2024-01-15T10:00:00Z'),
  ('20000000-0000-0000-0000-000000000005', '/uploads/2024/01/market-analysis.jpg',            'market-analysis.jpg',            'image/jpeg', 1800000, 'تحليل الأسواق',                             'Market analysis',                  'أسواق',  'd0000000-0000-0000-0000-000000000002', '2024-01-14T10:00:00Z'),
  ('20000000-0000-0000-0000-000000000006', '/uploads/2024/01/tech-innovation.jpg',            'tech-innovation.jpg',            'image/jpeg', 3100000, 'ابتكار تكنولوجي',                            'Tech innovation',                  'تكنولوجيا', 'd0000000-0000-0000-0000-000000000003', '2024-01-13T10:00:00Z'),
  ('20000000-0000-0000-0000-000000000007', '/uploads/2024/01/financial-report.pdf',           'financial-report.pdf',           'application/pdf', 856000, 'تقرير مالي',                            'Financial report',                 'تقارير', 'd0000000-0000-0000-0000-000000000004', '2024-01-12T10:00:00Z'),
  ('20000000-0000-0000-0000-000000000008', '/uploads/2024/01/energy-sector.jpg',              'energy-sector.jpg',              'image/jpeg', 2100000, 'قطاع الطاقة',                               'Energy sector',                    'طاقة',   'd0000000-0000-0000-0000-000000000001', '2024-01-09T10:00:00Z');

-- ──────────────────────────────────────────────────────────────
-- NEWSLETTER SUBSCRIBERS (sample)
-- ──────────────────────────────────────────────────────────────

INSERT INTO newsletter_subscribers (email, status, subscribed_at) VALUES
  ('reader1@example.com', 'active', '2025-10-01T08:00:00Z'),
  ('reader2@example.com', 'active', '2025-10-15T12:00:00Z'),
  ('reader3@example.com', 'unsubscribed', '2025-09-01T10:00:00Z');
