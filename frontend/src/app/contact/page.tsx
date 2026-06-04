import type { Metadata } from "next";
import { Mail, MessageSquare, Phone, MapPin, Clock, Zap, Shield, Send } from "lucide-react";

export const metadata: Metadata = {
  title: "تواصل معنا | TOLO",
  description: "تواصل مع فريق TOLO. نحن هنا للمساعدة 24/7. أرسل لنا استفساراتك ومقترحاتك.",
};

const contactMethods = [
  {
    icon: <Mail className="w-7 h-7" />,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    title: "البريد الإلكتروني",
    value: "support@tolo.app",
    description: "للاستفسارات العامة والدعم",
    action: "mailto:support@tolo.app",
    actionLabel: "أرسل بريداً",
  },
  {
    icon: <MessageSquare className="w-7 h-7" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    title: "الدعم المباشر",
    value: "دردشة مباشرة",
    description: "متاح 24/7 في التطبيق",
    action: "/dashboard",
    actionLabel: "ابدأ محادثة",
  },
  {
    icon: <Phone className="w-7 h-7" />,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    title: "الهاتف",
    value: "+20 1000 000 000",
    description: "من الأحد إلى الخميس 9ص - 5م",
    action: "tel:+201000000000",
    actionLabel: "اتصل الآن",
  },
];

const faqs = [
  {
    q: "كيف يمكنني إعادة تعيين كلمة المرور؟",
    a: "انتقل إلى صفحة تسجيل الدخول واضغط على 'نسيت كلمة المرور'. سيُرسَل لك رابط الاسترداد فوراً.",
  },
  {
    q: "هل يمكنني الوصول إلى المحتوى بدون اتصال بالإنترنت؟",
    a: "حالياً المحتوى يتطلب اتصالاً بالإنترنت. نعمل على إتاحة التحميل للاستخدام دون اتصال قريباً.",
  },
  {
    q: "كيف أحصل على استرداد للمدفوعات؟",
    a: "نقدم ضمان استرداد كامل خلال 7 أيام من الشراء. تواصل مع الدعم وسنعالج طلبك فوراً.",
  },
  {
    q: "هل يمكنني مشاركة حسابي مع شخص آخر؟",
    a: "لا، كل حساب مخصص لمستخدم واحد فقط لضمان تجربة شخصية وحماية تقدمك الدراسي.",
  },
];

export default function ContactPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/10 rounded-full opacity-15 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-blue-500/10 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
            <MessageSquare className="h-4 w-4" />
            <span>قاعدة العمليات</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
            كيف يمكننا{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              مساعدتك؟
            </span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto">
            فريق TOLO دائماً بجانبك. سواء كان استفساراً أو مشكلة تقنية أو اقتراحاً — نحن هنا.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {contactMethods.map((method, i) => (
            <a
              key={i}
              href={method.action}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 p-8 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 block"
            >
              <div className={`inline-flex p-4 rounded-2xl border ${method.bg} ${method.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {method.icon}
              </div>
              <h3 className="text-lg font-black mb-1">{method.title}</h3>
              <p className="text-primary font-bold mb-2">{method.value}</p>
              <p className="text-sm text-muted-foreground mb-6">{method.description}</p>
              <div className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest ${method.color}`}>
                <Send className="w-3 h-3" />
                {method.actionLabel}
              </div>
            </a>
          ))}
        </div>

        {/* Contact Form + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-16">
          {/* Form */}
          <div className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-border bg-card/40 p-8">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
              <Send className="w-6 h-6 text-primary" />
              أرسل لنا رسالة
            </h2>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground" htmlFor="contact-name">الاسم</label>
                  <input
                    id="contact-name"
                    type="text"
                    placeholder="اسمك الكريم"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground" htmlFor="contact-email">البريد الإلكتروني</label>
                  <input
                    id="contact-email"
                    type="email"
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground" htmlFor="contact-subject">الموضوع</label>
                <select
                  id="contact-subject"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                >
                  <option value="">اختر نوع الاستفسار</option>
                  <option value="support">مشكلة تقنية</option>
                  <option value="billing">الدفع والفواتير</option>
                  <option value="content">محتوى تعليمي</option>
                  <option value="partnership">شراكات</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground" htmlFor="contact-message">الرسالة</label>
                <textarea
                  id="contact-message"
                  rows={5}
                  placeholder="اكتب رسالتك هنا..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                id="contact-submit"
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-black font-black rounded-2xl hover:scale-[1.02] transition-transform"
              >
                <Send className="w-4 h-4" />
                إرسال الرسالة
              </button>
            </form>
          </div>

          {/* Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Response Time */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-black">وقت الاستجابة</h3>
              </div>
              <div className="space-y-3">
                {[
                  { type: "الدردشة المباشرة", time: "فوري" },
                  { type: "البريد الإلكتروني", time: "خلال ساعتين" },
                  { type: "الهاتف", time: "في أوقات العمل" },
                ].map((item) => (
                  <div key={item.type} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.type}</span>
                    <span className="font-bold text-green-400">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-black">ساعات العمل</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-bold text-foreground">الأحد – الخميس:</span> 9:00ص – 11:00م</p>
                <p><span className="font-bold text-foreground">الجمعة – السبت:</span> 12:00م – 8:00م</p>
                <p className="text-xs mt-3 text-primary font-bold">الدردشة المباشرة متاحة 24/7</p>
              </div>
            </div>

            {/* Security */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-black">رسائل آمنة</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                جميع رسائلك مشفّرة ومحمية. لن نطلب منك كلمة المرور أبداً.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-3xl font-black mb-10 text-center">
            الأسئلة الشائعة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-7"
              >
                <h3 className="font-black text-base mb-3 flex items-start gap-3">
                  <span className="text-primary font-black text-lg shrink-0">س.</span>
                  {faq.q}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed pr-7">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
