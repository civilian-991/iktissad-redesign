'use client';

import { motion } from 'motion/react';
import {
  Clock,
  Eye,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Link2,
  ChevronRight,
  Tag,
  User,
  Calendar,
  ArrowUpLeft
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Mock article data - in production this would come from an API
const article = {
  id: 1,
  title: 'فتح السوق السعودي أمام جميع فئات المستثمرين الأجانب اعتباراً من أول فبراير 2026',
  excerpt: 'في خطوة تاريخية نحو تحرير السوق المالي السعودي، أعلنت هيئة السوق المالية عن فتح السوق أمام جميع فئات المستثمرين الأجانب.',
  content: `
    <p>أعلنت هيئة السوق المالية السعودية عن قرار تاريخي يتيح لجميع فئات المستثمرين الأجانب الوصول المباشر إلى سوق الأسهم السعودي اعتباراً من الأول من فبراير 2026، في خطوة تهدف إلى تعزيز مكانة المملكة كوجهة استثمارية عالمية رائدة.</p>

    <h2>تفاصيل القرار</h2>
    <p>يأتي هذا القرار في إطار جهود المملكة لتحقيق أهداف رؤية 2030، والتي تسعى إلى تنويع مصادر الدخل وجذب الاستثمارات الأجنبية. وسيتيح القرار الجديد للمستثمرين الأفراد والمؤسسات من جميع أنحاء العالم شراء وبيع الأسهم السعودية مباشرة دون الحاجة إلى وسطاء محليين.</p>

    <blockquote>
      "هذا القرار يمثل نقلة نوعية في تاريخ السوق المالي السعودي، ويعكس ثقة المملكة في قدرتها على المنافسة عالمياً"
      <cite>- رئيس هيئة السوق المالية</cite>
    </blockquote>

    <h2>التأثير المتوقع</h2>
    <p>يتوقع المحللون أن يؤدي هذا القرار إلى:</p>
    <ul>
      <li>زيادة السيولة في السوق بنسبة تتراوح بين 15-20%</li>
      <li>ارتفاع حجم التداولات اليومية</li>
      <li>تحسن مستويات الشفافية والحوكمة</li>
      <li>جذب المزيد من الشركات للإدراج في السوق السعودي</li>
    </ul>

    <h2>ردود الفعل الدولية</h2>
    <p>رحبت المؤسسات المالية الدولية بهذا القرار، حيث أعرب عدد من كبار مديري الصناديق الاستثمارية عن نيتهم زيادة تخصيصاتهم للأسهم السعودية. كما أكدت وكالات التصنيف الائتماني أن هذه الخطوة ستعزز من جاذبية السوق السعودي للمستثمرين العالميين.</p>

    <p>من جانبه، أكد محافظ صندوق الاستثمارات العامة أن هذا القرار يأتي ضمن سلسلة من الإصلاحات الهيكلية التي تهدف إلى جعل المملكة العربية السعودية مركزاً مالياً إقليمياً وعالمياً.</p>
  `,
  image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=600&fit=crop',
  category: 'مال ومصارف',
  categorySlug: 'finance',
  author: 'فريق التحرير',
  date: '11 يناير 2026',
  readTime: '5 دقائق',
  views: '12,450',
  tags: ['السعودية', 'أسواق المال', 'استثمار', 'رؤية 2030']
};

const relatedArticles = [
  {
    id: 2,
    title: 'البنك المركزي المصري يسجل أعلى احتياطي نقد أجنبي',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop',
    category: 'مال ومصارف',
    date: '7 يناير 2026'
  },
  {
    id: 3,
    title: '"المعمر لأنظمة المعلومات" توافق على رفع رأس مال بنك فيجن',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    category: 'مال ومصارف',
    date: '5 يناير 2026'
  },
  {
    id: 4,
    title: 'خبراء الأمم المتحدة: نمو الاقتصاد العالمي 2.7% لسنة 2026',
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=300&fit=crop',
    category: 'اقتصاد عام',
    date: '10 يناير 2026'
  }
];

export default function ArticlePage() {
  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = article.title;

    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      return;
    }

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Image */}
        <div className="relative h-[50vh] lg:h-[60vh] overflow-hidden">
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/50 to-transparent" />

          {/* Breadcrumb */}
          <div className="absolute top-8 right-0 left-0">
            <div className="container-luxury">
              <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-white/70 text-sm font-[family-name:var(--font-display)]"
              >
                <a href="/" className="hover:text-gold transition-colors">الرئيسية</a>
                <ChevronRight size={14} />
                <a href={`/sectors/${article.categorySlug}`} className="hover:text-gold transition-colors">{article.category}</a>
                <ChevronRight size={14} />
                <span className="text-white/50 truncate max-w-[200px]">{article.title}</span>
              </motion.nav>
            </div>
          </div>

          {/* Title Overlay */}
          <div className="absolute bottom-0 right-0 left-0 pb-12">
            <div className="container-luxury">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="news-tag mb-4">{article.category}</span>
                <h1 className="text-3xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white leading-tight max-w-4xl">
                  {article.title}
                </h1>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="container-luxury py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Meta Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-6 mb-8 pb-8 border-b border-sand"
              >
                <span className="flex items-center gap-2 text-slate text-sm">
                  <User size={16} className="text-gold" />
                  {article.author}
                </span>
                <span className="flex items-center gap-2 text-slate text-sm">
                  <Calendar size={16} className="text-gold" />
                  {article.date}
                </span>
                <span className="flex items-center gap-2 text-slate text-sm">
                  <Clock size={16} className="text-gold" />
                  {article.readTime} قراءة
                </span>
                <span className="flex items-center gap-2 text-slate text-sm">
                  <Eye size={16} className="text-gold" />
                  {article.views} مشاهدة
                </span>
              </motion.div>

              {/* Excerpt */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-navy leading-relaxed mb-8 font-semibold"
              >
                {article.excerpt}
              </motion.p>

              {/* Article Body */}
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="prose prose-lg max-w-none
                  prose-headings:font-[family-name:var(--font-display)] prose-headings:text-navy prose-headings:font-bold
                  prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                  prose-p:text-charcoal prose-p:leading-relaxed prose-p:mb-6
                  prose-blockquote:border-r-4 prose-blockquote:border-gold prose-blockquote:pr-6 prose-blockquote:py-4 prose-blockquote:bg-ivory prose-blockquote:rounded-lg prose-blockquote:italic prose-blockquote:text-navy
                  prose-ul:list-disc prose-ul:pr-6 prose-li:text-charcoal prose-li:mb-2
                  prose-a:text-gold prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {/* Tags */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap items-center gap-3 mt-10 pt-8 border-t border-sand"
              >
                <Tag size={18} className="text-gold" />
                {article.tags.map((tag) => (
                  <a
                    key={tag}
                    href={`/search?tag=${encodeURIComponent(tag)}`}
                    className="px-4 py-2 bg-ivory rounded-full text-sm font-[family-name:var(--font-display)] text-navy hover:bg-gold hover:text-white transition-colors"
                  >
                    {tag}
                  </a>
                ))}
              </motion.div>

              {/* Share Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center gap-4 mt-8"
              >
                <span className="flex items-center gap-2 text-navy font-[family-name:var(--font-display)] font-semibold">
                  <Share2 size={18} />
                  مشاركة:
                </span>
                <button
                  onClick={() => handleShare('facebook')}
                  className="w-10 h-10 rounded-full bg-[#1877f2] text-white flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <Facebook size={18} />
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="w-10 h-10 rounded-full bg-[#1da1f2] text-white flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <Twitter size={18} />
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="w-10 h-10 rounded-full bg-[#0a66c2] text-white flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <Linkedin size={18} />
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="w-10 h-10 rounded-full bg-slate text-white flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <Link2 size={18} />
                </button>
              </motion.div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              {/* Related Articles */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl shadow-lg p-6 sticky top-24"
              >
                <h3 className="font-[family-name:var(--font-display)] font-bold text-xl text-navy mb-6 pb-4 border-b border-sand">
                  مقالات ذات صلة
                </h3>
                <div className="space-y-4">
                  {relatedArticles.map((related, index) => (
                    <motion.a
                      key={related.id}
                      href={`/news/${related.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex gap-4 group"
                    >
                      <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={related.image}
                          alt={related.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gold font-[family-name:var(--font-display)] font-semibold">
                          {related.category}
                        </span>
                        <h4 className="font-[family-name:var(--font-display)] font-semibold text-sm text-navy leading-snug line-clamp-2 group-hover:text-gold transition-colors">
                          {related.title}
                        </h4>
                        <span className="text-xs text-slate mt-1 flex items-center gap-1">
                          <Clock size={10} />
                          {related.date}
                        </span>
                      </div>
                    </motion.a>
                  ))}
                </div>

                <a
                  href={`/sectors/${article.categorySlug}`}
                  className="flex items-center justify-center gap-2 w-full mt-6 py-3 rounded-lg border-2 border-dashed border-gold/30 text-gold font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/10 transition-colors"
                >
                  المزيد من {article.category}
                  <ArrowUpLeft size={16} />
                </a>
              </motion.div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
