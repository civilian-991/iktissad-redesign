'use client';

import { motion } from 'motion/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const sections = [
  {
    title: 'قبول الشروط',
    content: `باستخدامك لموقع الإقتصاد والأعمال، فإنك توافق على الالتزام بشروط الاستخدام هذه. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام الموقع.

نحتفظ بالحق في تعديل هذه الشروط في أي وقت. استمرارك في استخدام الموقع بعد أي تعديلات يعني موافقتك على الشروط المعدلة.`
  },
  {
    title: 'استخدام الموقع',
    content: `يُسمح لك باستخدام هذا الموقع للأغراض الشخصية وغير التجارية فقط. يُحظر عليك:
    - نسخ أو توزيع المحتوى دون إذن كتابي
    - استخدام الموقع لأي غرض غير قانوني
    - محاولة اختراق أو تعطيل الموقع
    - نشر محتوى مسيء أو غير لائق
    - انتحال شخصية أي شخص أو كيان
    - جمع بيانات المستخدمين دون موافقة`
  },
  {
    title: 'الملكية الفكرية',
    content: `جميع المحتويات المنشورة على هذا الموقع، بما في ذلك النصوص والصور والرسومات والشعارات والتصميم، محمية بموجب قوانين الملكية الفكرية.

حقوق الطبع والنشر © الإقتصاد والأعمال. جميع الحقوق محفوظة.

لا يجوز إعادة إنتاج أو توزيع أو نقل أو تخزين أي جزء من محتوى الموقع دون الحصول على إذن كتابي مسبق.`
  },
  {
    title: 'المحتوى المنشور',
    content: `المعلومات المقدمة على هذا الموقع هي لأغراض إعلامية فقط ولا تشكل نصيحة مالية أو استثمارية أو قانونية.

نسعى لتقديم معلومات دقيقة ومحدثة، لكننا لا نضمن اكتمال أو دقة أو موثوقية أي محتوى. القرارات المتخذة بناءً على محتوى الموقع هي مسؤوليتك الشخصية.

الآراء المعبر عنها في مقالات الرأي تمثل آراء كتابها ولا تعكس بالضرورة موقف الإقتصاد والأعمال.`
  },
  {
    title: 'التعليقات والمشاركات',
    content: `عند نشر تعليق أو مشاركة، فإنك تمنحنا ترخيصاً غير حصري لاستخدام ونشر وتعديل المحتوى.

تتحمل المسؤولية الكاملة عن محتوى تعليقاتك. نحتفظ بالحق في:
    - حذف أو تعديل أي تعليق نراه غير مناسب
    - حظر المستخدمين الذين ينتهكون الشروط
    - مشاركة المعلومات مع السلطات عند الضرورة`
  },
  {
    title: 'الروابط الخارجية',
    content: `قد يحتوي الموقع على روابط لمواقع خارجية. هذه الروابط مقدمة لراحتك فقط ولا تعني تأييدنا لهذه المواقع.

لسنا مسؤولين عن محتوى أو ممارسات الخصوصية لأي مواقع خارجية. ننصحك بقراءة شروط الاستخدام وسياسات الخصوصية لأي موقع تزوره.`
  },
  {
    title: 'إخلاء المسؤولية',
    content: `يُقدم الموقع "كما هو" دون أي ضمانات صريحة أو ضمنية. لا نضمن:
    - توفر الموقع بشكل مستمر دون انقطاع
    - خلو الموقع من الأخطاء أو الفيروسات
    - دقة أو اكتمال المعلومات المقدمة

لن نكون مسؤولين عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدامك للموقع.`
  },
  {
    title: 'القانون الحاكم',
    content: `تخضع شروط الاستخدام هذه لقوانين الجمهورية اللبنانية وتُفسر وفقاً لها. أي نزاع ينشأ عن استخدام الموقع يخضع للاختصاص الحصري لمحاكم بيروت، لبنان.`
  }
];

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-20 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mb-4">
                شروط الاستخدام
              </h1>
              <p className="text-white/70">
                آخر تحديث: يناير 2024
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container-luxury">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-8 lg:p-12 shadow-lg mb-8"
              >
                <p className="text-charcoal leading-relaxed text-lg">
                  مرحباً بك في موقع الإقتصاد والأعمال. تحكم شروط الاستخدام هذه علاقتك مع الموقع وتحدد حقوقك والتزاماتك عند استخدامه. يرجى قراءة هذه الشروط بعناية قبل استخدام الموقع.
                </p>
              </motion.div>

              <div className="space-y-6">
                {sections.map((section, index) => (
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl p-6 lg:p-8 shadow-md"
                  >
                    <h2 className="text-xl font-[family-name:var(--font-display)] font-bold text-navy mb-4 flex items-center gap-3">
                      <span className="w-6 h-6 bg-gold text-white text-sm flex items-center justify-center rounded">
                        {index + 1}
                      </span>
                      {section.title}
                    </h2>
                    <div className="text-charcoal leading-relaxed whitespace-pre-line">
                      {section.content}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Contact */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-navy rounded-2xl p-8 text-white text-center mt-12"
              >
                <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold mb-4 text-white">
                  أسئلة؟
                </h2>
                <p className="text-white/70 mb-6">
                  إذا كانت لديك أي أسئلة حول شروط الاستخدام، يرجى التواصل معنا:
                </p>
                <a href="mailto:legal@iktissadonline.com" className="text-gold hover:underline">
                  legal@iktissadonline.com
                </a>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
