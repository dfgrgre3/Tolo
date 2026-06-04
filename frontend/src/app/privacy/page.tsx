import type { Metadata } from "next";
import { Shield, Lock, Eye, Database, Bell, UserCheck, Mail, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "سياسة الخصوصية | TOLO",
  description: "تعرّف على كيفية جمع TOLO وحماية بياناتك الشخصية. نحن نأخذ خصوصيتك على محمل الجد.",
};

const sections = [
  {
    id: "collect",
    icon: <Database className="w-6 h-6" />,
    title: "البيانات التي نجمعها",
    content: [
      "**معلومات الحساب**: الاسم، البريد الإلكتروني، كلمة المرور المشفّرة عند إنشاء الحساب.",
      "**بيانات الاستخدام**: الكورسات التي تشاهدها، نقاط XP، وتقدمك في المسارات التعليمية.",
      "**بيانات الجهاز**: نوع المتصفح، نظام التشغيل، وعنوان IP لأغراض الأمان والتحسين.",
      "**بيانات الدفع**: لا نخزّن بيانات بطاقتك — تتم معالجة المدفوعات عبر موفرين معتمدين ومشفّرين.",
    ],
  },
  {
    id: "use",
    icon: <Eye className="w-6 h-6" />,
    title: "كيف نستخدم بياناتك",
    content: [
      "تقديم وتحسين خدماتنا التعليمية وتجربة التعلم الشخصية.",
      "إرسال إشعارات مهمة تتعلق بحسابك وتقدمك الدراسي.",
      "تحليل أنماط الاستخدام لتطوير محتوى أفضل.",
      "الكشف عن الاحتيال وحماية أمان المنصة.",
    ],
  },
  {
    id: "protect",
    icon: <Lock className="w-6 h-6" />,
    title: "كيف نحمي بياناتك",
    content: [
      "**تشفير SSL/TLS**: جميع البيانات المنقولة مشفّرة بالكامل.",
      "**تشفير كلمات المرور**: لا نخزن كلمات المرور بشكل مباشر — نستخدم تشفير bcrypt.",
      "**مراجعات أمنية دورية**: نجري فحوصات أمنية منتظمة للكشف عن أي ثغرات.",
      "**وصول محدود**: موظفونا لديهم صلاحيات محدودة حسب المهام فقط.",
    ],
  },
  {
    id: "share",
    icon: <UserCheck className="w-6 h-6" />,
    title: "مشاركة البيانات مع أطراف ثالثة",
    content: [
      "**لا نبيع بياناتك أبداً** لأي طرف ثالث لأغراض تجارية.",
      "نشارك بيانات محدودة مع مزودي خدمات موثوقين (مثل بوابات الدفع) لتشغيل الخدمة فقط.",
      "قد نكشف عن بيانات إذا طُلب ذلك قانونياً أو لمنع ضرر جسيم.",
      "في حالة الاندماج أو الاستحواذ، ستُخطر قبل نقل أي بيانات.",
    ],
  },
  {
    id: "rights",
    icon: <Shield className="w-6 h-6" />,
    title: "حقوقك",
    content: [
      "**الوصول**: طلب نسخة من جميع بياناتك المخزّنة لدينا.",
      "**التصحيح**: تحديث أو تصحيح أي معلومات غير دقيقة.",
      "**الحذف**: طلب حذف حسابك وجميع بياناتك.",
      "**الاعتراض**: رفض بعض أنواع معالجة البيانات.",
    ],
  },
  {
    id: "notifications",
    icon: <Bell className="w-6 h-6" />,
    title: "الإشعارات والتسويق",
    content: [
      "نرسل إشعارات تتعلق بتقدمك الدراسي ومهامك بشكل افتراضي.",
      "يمكنك إلغاء الاشتراك في أي رسائل تسويقية في أي وقت من إعدادات حسابك.",
      "الإشعارات المتعلقة بالأمان والحساب لا يمكن إيقافها لحمايتك.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-primary/10 rounded-full opacity-15 blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
            <Shield className="h-4 w-4" />
            <span>ميثاق الخصوصية</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
            سياسة{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              الخصوصية
            </span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto">
            خصوصيتك هي ميثاق شرف بيننا وبينك. نشرح هنا بوضوح كيف نتعامل مع بياناتك.
          </p>
          <p className="text-sm text-muted-foreground">
            آخر تحديث: يونيو 2026
          </p>
        </div>

        {/* Highlight Box */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-8 mb-12">
          <div className="flex gap-4 items-start">
            <Lock className="w-8 h-8 text-primary shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-black mb-2">خلاصة سريعة</h2>
              <p className="text-muted-foreground leading-relaxed">
                لا نبيع بياناتك. لا نشاركها إلا لتشغيل الخدمة. تحكم كامل في بياناتك في أي وقت.
                نستخدم أحدث معايير التشفير لحماية معلوماتك.
              </p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, i) => (
            <div
              key={section.id}
              className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  {section.icon}
                </div>
                <h2 className="text-xl font-black">{section.title}</h2>
              </div>
              <ul className="space-y-3">
                {section.content.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-muted-foreground leading-relaxed">
                    <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-16 relative overflow-hidden rounded-2xl border border-border bg-card/40 p-10 text-center">
          <Mail className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-3">لديك سؤال؟</h2>
          <p className="text-muted-foreground mb-6">
            إذا كان لديك أي استفسار حول سياسة الخصوصية أو بياناتك، تواصل معنا.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-black rounded-2xl hover:scale-105 transition-transform"
          >
            <Mail className="w-4 h-4" />
            تواصل مع فريق الخصوصية
          </a>
        </div>
      </div>
    </div>
  );
}
