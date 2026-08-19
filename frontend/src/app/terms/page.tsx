import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  CreditCard,
  FileText,
  Gavel,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { SITE, CONTACT, LEGAL } from "@thanawy/shared/site-config";

export const metadata: Metadata = {
  title: `الشروط والأحكام | ${SITE.name}`,
  description: `الشروط والأحكام المنظِّمة لاستخدام منصة ${SITE.name} التعليمية: الحساب، الاشتراكات، الملكية الفكرية، وقواعد السلوك.`,
  keywords: [
    "الشروط والأحكام",
    SITE.name,
    "شروط الاستخدام",
    "اتفاقية المستخدم",
    "الاشتراكات",
    "التعليم عبر الإنترنت",
  ],
  openGraph: {
    title: `الشروط والأحكام | ${SITE.name}`,
    description: `الشروط والأحكام المنظِّمة لاستخدام منصة ${SITE.name} التعليمية.`,
    type: "website",
    locale: "ar_EG",
  },
};

const lastUpdated = "يونيو 2026";
const effectiveDate = "1 يوليو 2026";

const tableOfContents = [
  { id: "acceptance", title: "قبول الشروط" },
  { id: "account", title: "الحساب والتسجيل" },
  { id: "usage", title: "قواعد الاستخدام المقبول" },
  { id: "content", title: "المحتوى والملكية الفكرية" },
  { id: "payments", title: "الاشتراكات والمدفوعات" },
  { id: "refund", title: "سياسة الاسترداد والإلغاء" },
  { id: "termination", title: "إيقاف الحساب وإنهاء الخدمة" },
  { id: "liability", title: "حدود المسؤولية" },
  { id: "changes", title: "تعديل الشروط" },
  { id: "law", title: "القانون الحاكم" },
];

const sections = [
  {
    id: "acceptance",
    icon: <UserCheck className="w-6 h-6" />,
    title: "قبول الشروط",
    description: `باستخدامك منصة ${SITE.name} فإنك توافق على هذه الشروط بالكامل.`,
    blocks: [
      {
        title: "نطاق الاتفاقية",
        items: [
          `تُعد هذه الشروط اتفاقية ملزمة بينك وبين ${LEGAL.companyNameAr}.`,
          "استخدامك للمنصة — بالتسجيل أو التصفح أو الشراء — يعني موافقتك على هذه الشروط.",
          "إذا كنت دون سن 18 عاماً، يلزم استخدام المنصة بعلم ولي الأمر وموافقته.",
          `تُقرأ هذه الشروط جنباً إلى جنب مع سياسة الخصوصية الخاصة بالمنصة.`,
        ],
      },
    ],
  },
  {
    id: "account",
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "الحساب والتسجيل",
    description: "حسابك مسؤوليتك، وبياناته يجب أن تكون صحيحة ومحدَّثة.",
    blocks: [
      {
        title: "التزاماتك تجاه الحساب",
        items: [
          "تقديم بيانات تسجيل صحيحة وكاملة وتحديثها عند تغيّرها.",
          "الحفاظ على سرية كلمة المرور وعدم مشاركة الحساب مع أي شخص آخر.",
          "إبلاغنا فوراً عند الاشتباه في أي استخدام غير مصرَّح به لحسابك.",
          "الحساب شخصي وغير قابل للتحويل أو البيع أو الإيجار.",
        ],
      },
      {
        title: "الأمان",
        items: [
          "نوصي بتفعيل المصادقة الثنائية من إعدادات الأمان لحماية حسابك.",
          "يمكنك مراجعة الأجهزة المتصلة وسجل الدخول وإنهاء أي جلسة غير معروفة.",
        ],
      },
    ],
  },
  {
    id: "usage",
    icon: <BookOpen className="w-6 h-6" />,
    title: "قواعد الاستخدام المقبول",
    description: "المنصة بيئة تعليمية، ونتوقع سلوكاً يحفظ حق الجميع في التعلم.",
    blocks: [
      {
        title: "ممنوع تماماً",
        items: [
          "تسجيل أو تنزيل أو إعادة نشر الدروس والفيديوهات بأي صورة.",
          "مشاركة بيانات الدخول لتمكين آخرين من الوصول إلى محتوى مدفوع.",
          "محاولة اختراق المنصة أو تجاوز إجراءات الحماية أو الهندسة العكسية.",
          "استخدام أدوات آلية لجمع البيانات (Scraping) دون تصريح كتابي.",
          "نشر محتوى مسيء أو مخالف للقانون في المنتدى أو الدردشة أو التعليقات.",
          "الغش في الاختبارات أو التلاعب في نقاط الخبرة ولوحة الصدارة.",
        ],
      },
      {
        title: "المحتوى الذي تنشره",
        items: [
          "أنت المسؤول الوحيد عن أي محتوى تنشره على المنصة.",
          "تمنحنا ترخيصاً غير حصري لعرض محتواك داخل المنصة لأغراض تشغيلها.",
          "يحق لنا حذف أي محتوى مخالف دون إشعار مسبق.",
        ],
      },
    ],
  },
  {
    id: "content",
    icon: <FileText className="w-6 h-6" />,
    title: "المحتوى والملكية الفكرية",
    description: "كل ما تراه على المنصة محمي بحقوق الملكية الفكرية.",
    blocks: [
      {
        title: "حقوقنا وحقوق المدرسين",
        items: [
          `جميع الدورات والامتحانات والتصميمات والشعارات مملوكة لـ ${LEGAL.companyNameAr} أو لمدرسيها المتعاونين.`,
          "الاشتراك يمنحك حق وصول شخصي غير حصري للمحتوى لأغراض التعلم فقط.",
          "لا يُسمح بإعادة البيع أو الاستخدام التجاري أو العرض الجماعي للمحتوى.",
          "الاستخدام المخالف يعرّضك للمساءلة القانونية وإيقاف الحساب نهائياً.",
        ],
      },
      {
        title: "الشهادات",
        items: [
          "الشهادات تُمنح عند إتمام متطلبات الدورة، وتُصدر باسم صاحب الحساب.",
          `يمكن التحقق من صحة أي شهادة عبر رابط التحقق الرسمي: ${LEGAL.verificationBaseUrl}.`,
          "أي تعديل أو تحريف في الشهادة يُلغي صلاحيتها ويُعرِّض الحساب للإيقاف.",
        ],
      },
    ],
  },
  {
    id: "payments",
    icon: <CreditCard className="w-6 h-6" />,
    title: "الاشتراكات والمدفوعات",
    description: "أسعار واضحة، وفواتير موثقة داخل حسابك.",
    blocks: [
      {
        title: "الأسعار والفواتير",
        items: [
          "تُعرض جميع الأسعار بالجنيه المصري وتشمل الضرائب المطبقة قانوناً.",
          "تُعالج المدفوعات عبر بوابات دفع معتمدة، ولا نقوم بتخزين بيانات بطاقتك.",
          "تجد جميع فواتيرك وسجل مدفوعاتك في صفحة الفواتير داخل حسابك.",
          "قد نُعدِّل الأسعار مستقبلاً، ولا يسري التعديل على اشتراك جارٍ سارٍ بالفعل.",
        ],
      },
      {
        title: "التجديد",
        items: [
          "الاشتراكات الدورية تُجدَّد تلقائياً في نهاية كل دورة إلا إذا ألغيتها قبل موعد التجديد.",
          "فشل عملية الدفع قد يؤدي إلى تعليق الوصول إلى المحتوى المدفوع حتى تسوية المبلغ.",
        ],
      },
    ],
  },
  {
    id: "refund",
    icon: <RefreshCw className="w-6 h-6" />,
    title: "سياسة الاسترداد والإلغاء",
    description: "نلتزم بالشفافية في حالات الاسترداد.",
    blocks: [
      {
        title: "حالات الاسترداد",
        items: [
          "يمكنك طلب استرداد كامل خلال 14 يوماً من الشراء إذا لم يتجاوز تقدمك 20% من الدورة.",
          "لا يُستحق الاسترداد بعد إتمام الدورة أو إصدار الشهادة.",
          "في حالة خطأ تقني منعك من استخدام الخدمة، يُسترد المبلغ كاملاً أو تُمدَّد المدة.",
          "تُنفَّذ عمليات الاسترداد على نفس وسيلة الدفع خلال 14 يوم عمل من الموافقة.",
        ],
      },
      {
        title: "الإلغاء",
        items: [
          "يمكنك إلغاء التجديد التلقائي في أي وقت من صفحة الاشتراكات.",
          "بعد الإلغاء يستمر وصولك حتى نهاية الفترة المدفوعة بالفعل.",
        ],
      },
    ],
  },
  {
    id: "termination",
    icon: <XCircle className="w-6 h-6" />,
    title: "إيقاف الحساب وإنهاء الخدمة",
    description: "نحتفظ بحق حماية المنصة ومستخدميها.",
    blocks: [
      {
        title: "حالات الإيقاف",
        items: [
          "مخالفة قواعد الاستخدام المقبول أو محاولة قرصنة المحتوى.",
          "استخدام الحساب بشكل جماعي أو مشاركته مع آخرين.",
          "أي نشاط احتيالي متعلق بالدفع أو استرداد الأموال.",
          "يمكنك أنت أيضاً حذف حسابك في أي وقت من إعدادات الحساب.",
        ],
      },
    ],
  },
  {
    id: "liability",
    icon: <AlertTriangle className="w-6 h-6" />,
    title: "حدود المسؤولية",
    description: "نبذل أقصى جهد لتقديم خدمة مستقرة، مع حدود واضحة للمسؤولية.",
    blocks: [
      {
        title: "ما نضمنه وما لا نضمنه",
        items: [
          "نسعى لاستمرارية الخدمة لكننا لا نضمن عملها دون انقطاع أو خلوها من الأخطاء.",
          "المحتوى التعليمي مقدَّم لأغراض التعلم، ولا نضمن نتيجة دراسية محددة.",
          "لا نتحمل المسؤولية عن أضرار غير مباشرة أو فقد أرباح ناتج عن استخدام المنصة.",
          "قد نُجري صيانة مجدولة، ونحاول الإشعار بها مسبقاً عبر إعلانات المنصة.",
        ],
      },
    ],
  },
  {
    id: "changes",
    icon: <Gavel className="w-6 h-6" />,
    title: "تعديل الشروط",
    description: "قد تتغير هذه الشروط مع تطور خدماتنا.",
    blocks: [
      {
        title: "كيف نُعلمك؟",
        items: [
          "نُخطرك بالتعديلات الجوهرية عبر البريد الإلكتروني المسجَّل أو إعلان داخل المنصة.",
          "استمرارك في استخدام المنصة بعد سريان التعديل يُعد قبولاً به.",
          "تاريخ آخر تحديث مثبَّت في أعلى هذه الصفحة للرجوع إليه.",
        ],
      },
    ],
  },
  {
    id: "law",
    icon: <Gavel className="w-6 h-6" />,
    title: "القانون الحاكم",
    description: "تخضع هذه الشروط للقانون المصري.",
    blocks: [
      {
        title: "الاختصاص القضائي",
        items: [
          "تُفسَّر هذه الشروط وتُنفَّذ وفقاً لقوانين جمهورية مصر العربية.",
          "أي نزاع ينشأ عن استخدام المنصة تختص به المحاكم المصرية.",
          `السجل التجاري: ${LEGAL.commercialReg} — البطاقة الضريبية: ${LEGAL.taxId}.`,
          "نسعى دائماً لحل أي نزاع ودياً قبل اللجوء إلى الطرق القضائية.",
        ],
      },
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground" dir="rtl">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/5 rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-blue-600/5 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20 lg:py-24">
        {/* ========== HERO ========== */}
        <div className="text-center mb-12 sm:mb-16 space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-5 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-primary">
            <Gavel className="h-4 w-4" />
            <span>الاتفاقية القانونية</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-tight">
            الشروط{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              والأحكام
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-3xl mx-auto leading-relaxed">
            هذه الشروط تنظّم العلاقة بينك وبين منصة {SITE.name}: كيف تستخدم الحساب، ما هي
            حقوقك على المحتوى، وكيف تُدار الاشتراكات والمدفوعات. اقرأها بعناية قبل استخدام
            المنصة.
          </p>

          <div className="flex flex-wrap justify-center gap-3 text-xs sm:text-sm font-bold">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
              <FileText className="h-3.5 w-3.5" />
              آخر تحديث: {lastUpdated}
            </span>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              ساري من: {effectiveDate}
            </span>
          </div>
        </div>

        {/* ========== TABLE OF CONTENTS ========== */}
        <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8 mb-10 lg:mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black">جدول المحتويات</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tableOfContents.map((item, i) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 transition-colors group"
              >
                <span className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-bold group-hover:text-primary transition-colors">
                  {item.title}
                </span>
                <ChevronRight className="w-4 h-4 mr-auto text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        </div>

        {/* ========== SECTIONS ========== */}
        <div className="space-y-8 lg:space-y-10">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-2xl border border-border bg-gradient-to-br from-card/30 to-card/10 p-6 sm:p-8 lg:p-10"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 w-fit">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black">{section.title}</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    {section.description}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {section.blocks.map((block) => (
                  <div key={block.title}>
                    <h3 className="text-base sm:text-lg font-bold mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {block.title}
                    </h3>
                    <ul className="space-y-2.5">
                      {block.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 text-sm sm:text-base text-muted-foreground leading-relaxed"
                        >
                          <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* ========== CONTACT ========== */}
        <div className="mt-12 lg:mt-16 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-8 sm:p-10 text-center">
          <div className="p-3 rounded-xl bg-primary/20 border border-primary/30 text-primary w-fit mx-auto mb-4">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3">لديك استفسار قانوني؟</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            راسلنا على{" "}
            <a href={`mailto:${CONTACT.email}`} className="text-primary underline" dir="ltr">
              {CONTACT.email}
            </a>{" "}
            أو من خلال صفحة التواصل وسنعود إليك في أقرب وقت.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-black rounded-2xl hover:opacity-90 transition-opacity"
            >
              <Mail className="w-4 h-4" />
              تواصل معنا
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 px-8 py-4 border border-border bg-card font-bold rounded-2xl hover:border-primary/30 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              سياسة الخصوصية
            </Link>
          </div>
        </div>

        <div className="mt-12 text-center text-xs sm:text-sm text-muted-foreground border-t border-border pt-8">
          <p className="font-bold">
            © {new Date().getFullYear()} {LEGAL.companyNameAr}. جميع الحقوق محفوظة.
          </p>
          <p className="mt-1">آخر تحديث: {lastUpdated}</p>
        </div>
      </div>
    </div>
  );
}
