'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, MessageSquare, Building2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const contactInfo = [
  { icon: MapPin, title: 'العنوان', value: 'بيروت، لبنان - شارع الحمرا', subtitle: 'المقر الرئيسي' },
  { icon: Phone, title: 'الهاتف', value: '+961 1 000 000', subtitle: 'متاح 24/7' },
  { icon: Mail, title: 'البريد الإلكتروني', value: 'info@iktissadonline.com', subtitle: 'للاستفسارات العامة' },
  { icon: Clock, title: 'ساعات العمل', value: 'الأحد - الخميس', subtitle: '9:00 ص - 6:00 م' },
];

const offices = [
  { city: 'بيروت', country: 'لبنان', address: 'شارع الحمرا، بناية الإقتصاد', phone: '+961 1 000 000' },
  { city: 'دبي', country: 'الإمارات', address: 'مركز دبي المالي العالمي', phone: '+971 4 000 0000' },
  { city: 'الرياض', country: 'السعودية', address: 'حي الملقا، طريق الملك فهد', phone: '+966 11 000 0000' },
  { city: 'القاهرة', country: 'مصر', address: 'وسط البلد، شارع طلعت حرب', phone: '+20 2 0000 0000' },
];

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormState({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

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
              className="text-center"
            >
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mb-4">
                تواصل معنا
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                نسعد بتواصلكم معنا. فريقنا جاهز للإجابة على استفساراتكم
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-12 -mt-8">
          <div className="container-luxury">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {contactInfo.map((info, index) => (
                <motion.div
                  key={info.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-6 shadow-lg text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                    <info.icon className="text-gold" size={24} />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy mb-1">
                    {info.title}
                  </h3>
                  <p className="text-charcoal font-semibold">{info.value}</p>
                  <p className="text-slate text-sm">{info.subtitle}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form & Map */}
        <section className="py-16">
          <div className="container-luxury">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <MessageSquare className="text-gold" size={28} />
                    <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy">
                      أرسل رسالة
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-[family-name:var(--font-display)] text-navy mb-2">
                          الاسم الكامل
                        </label>
                        <input
                          type="text"
                          value={formState.name}
                          onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-ivory border border-sand focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-[family-name:var(--font-display)] text-navy mb-2">
                          البريد الإلكتروني
                        </label>
                        <input
                          type="email"
                          value={formState.email}
                          onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-ivory border border-sand focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-[family-name:var(--font-display)] text-navy mb-2">
                        الموضوع
                      </label>
                      <select
                        value={formState.subject}
                        onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-ivory border border-sand focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                        required
                      >
                        <option value="">اختر الموضوع</option>
                        <option value="general">استفسار عام</option>
                        <option value="advertising">الإعلانات</option>
                        <option value="partnership">شراكات</option>
                        <option value="press">استفسارات صحفية</option>
                        <option value="technical">الدعم الفني</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-[family-name:var(--font-display)] text-navy mb-2">
                        الرسالة
                      </label>
                      <textarea
                        value={formState.message}
                        onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-3 rounded-lg bg-ivory border border-sand focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all resize-none"
                        required
                      />
                    </div>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isSubmitted}
                      className={`w-full py-4 rounded-lg font-[family-name:var(--font-display)] font-bold flex items-center justify-center gap-2 transition-all ${
                        isSubmitted
                          ? 'bg-green-500 text-white'
                          : 'bg-gold text-white hover:bg-gold-dark'
                      }`}
                    >
                      {isSubmitted ? (
                        <>
                          <CheckCircle size={20} />
                          تم إرسال الرسالة
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          إرسال الرسالة
                        </>
                      )}
                    </motion.button>
                  </form>
                </div>
              </motion.div>

              {/* Offices */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="text-gold" size={28} />
                  <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy">
                    مكاتبنا
                  </h2>
                </div>

                <div className="space-y-4">
                  {offices.map((office, index) => (
                    <motion.div
                      key={office.city}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border-r-4 border-gold"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg">
                            {office.city}
                          </h3>
                          <p className="text-gold text-sm font-semibold mb-2">{office.country}</p>
                          <p className="text-slate text-sm mb-1">{office.address}</p>
                          <p className="text-charcoal text-sm font-semibold">{office.phone}</p>
                        </div>
                        <MapPin className="text-gold flex-shrink-0" size={20} />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Map Placeholder */}
                <div className="mt-6 h-64 rounded-xl bg-navy/10 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="mx-auto text-gold mb-2" size={40} />
                    <p className="text-slate font-[family-name:var(--font-display)]">
                      خريطة المواقع
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
