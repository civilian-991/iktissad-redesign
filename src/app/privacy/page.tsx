'use client';

import { motion } from 'motion/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const sections = [
  {
    title: 'جمع المعلومات',
    content: `نقوم بجمع المعلومات التي تقدمها لنا مباشرة عند:
    - التسجيل في الموقع أو الاشتراك في النشرة البريدية
    - التواصل معنا عبر نموذج الاتصال
    - المشاركة في الاستطلاعات أو المسابقات
    - التعليق على المقالات

    كما نجمع معلومات تلقائياً تشمل:
    - عنوان IP الخاص بك
    - نوع المتصفح ونظام التشغيل
    - الصفحات التي تزورها ومدة الزيارة
    - الروابط التي تنقر عليها`
  },
  {
    title: 'استخدام المعلومات',
    content: `نستخدم المعلومات التي نجمعها لـ:
    - تقديم وتحسين خدماتنا
    - إرسال النشرات البريدية والتحديثات
    - الرد على استفساراتك وطلباتك
    - تحليل استخدام الموقع وتحسين تجربة المستخدم
    - حماية حقوقنا وحقوق المستخدمين
    - الامتثال للمتطلبات القانونية`
  },
  {
    title: 'مشاركة المعلومات',
    content: `لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك مع:
    - مزودي الخدمات الذين يساعدوننا في تشغيل الموقع
    - شركائنا في الإعلانات (بيانات مجمعة وغير شخصية)
    - السلطات القانونية عند الضرورة

    نتطلب من جميع الأطراف الثالثة احترام أمن بياناتك ومعالجتها وفقاً للقانون.`
  },
  {
    title: 'ملفات تعريف الارتباط (Cookies)',
    content: `نستخدم ملفات تعريف الارتباط لـ:
    - تذكر تفضيلاتك وإعداداتك
    - فهم كيفية استخدامك للموقع
    - تحسين تجربة التصفح
    - عرض إعلانات ذات صلة

    يمكنك التحكم في ملفات تعريف الارتباط من خلال إعدادات متصفحك.`
  },
  {
    title: 'أمن البيانات',
    content: `نتخذ إجراءات أمنية مناسبة لحماية معلوماتك من:
    - الوصول غير المصرح به
    - التغيير أو الإفصاح
    - التدمير غير القانوني

    نستخدم تشفير SSL لحماية البيانات المنقولة. ومع ذلك، لا يمكن ضمان أمان كامل لنقل البيانات عبر الإنترنت.`
  },
  {
    title: 'حقوقك',
    content: `لديك الحق في:
    - الوصول إلى بياناتك الشخصية
    - تصحيح البيانات غير الدقيقة
    - طلب حذف بياناتك
    - الاعتراض على معالجة بياناتك
    - سحب موافقتك في أي وقت
    - تقديم شكوى إلى السلطة المختصة

    للممارسة أي من هذه الحقوق، تواصل معنا عبر البريد الإلكتروني.`
  },
  {
    title: 'التغييرات على السياسة',
    content: `قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنخطرك بأي تغييرات جوهرية عن طريق:
    - نشر السياسة الجديدة على هذه الصفحة
    - إرسال إشعار عبر البريد الإلكتروني
    - عرض إشعار بارز على موقعنا

    ننصحك بمراجعة هذه الصفحة بشكل دوري.`
  }
];

export default function PrivacyPage() {
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
                سياسة الخصوصية
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
                  نحن في الإقتصاد والأعمال نلتزم بحماية خصوصيتك. توضح سياسة الخصوصية هذه كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك الشخصية عند استخدامك لموقعنا الإلكتروني.
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
                      <span className="w-2 h-6 bg-gold rounded-full" />
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
                  تواصل معنا
                </h2>
                <p className="text-white/70 mb-6">
                  إذا كانت لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى التواصل معنا:
                </p>
                <a href="mailto:privacy@iktissadonline.com" className="text-gold hover:underline">
                  privacy@iktissadonline.com
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
