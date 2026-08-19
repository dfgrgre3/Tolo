import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  CreditCard,
  HelpCircle,
  Mail,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { SITE, CONTACT } from "@thanawy/shared/site-config";

export const metadata: Metadata = {
  title: `الأسئلة الشائعة | ${SITE.name}`,
  description: `إجابات على أكثر الأسئلة تكراراً حول منصة ${SITE.name}: الحساب، الدورات، الاشتراكات، الشهادات، والدعم الفني.`,
  keywords: [
    "الأسئلة الشائعة",
    SITE.name,
    "الدعم",
    "مساعدة",
    "الاشتراكات",
    "الشهادات",
  ],
  openGraph: {
    title: `الأسئلة الشائعة | ${SITE.name}`,
    description: `إجابات على أكثر الأسئلة تكراراً حول استخدام منصة ${SITE.name}.`,
    type: "website",
    locale: "ar_EG",
  },
};

const faqGroups = [
  {
    id: "account",
    icon: <UserCheck className="w-6 h-6" />,
    title: "الحساب والتسجيل",
    items: [
      {
        q: "كيف أنشئ حساباً على المنصة؟",
        a: "اضغط على «إنشاء حساب» في أعلى الصفحة، أدخل اسمك وبريدك الإلكتروني وكلمة مرور قوية، ثم أكِّد بريدك من رسالة التحقق التي ستصلك. بعد التأكيد يمكنك إكمال بياناتك الدراسية (المرحلة والصف) للحصول على محتوى مناسب لمستواك.",
      },
      {
        q: "نسيت كلمة المرور، ماذا أفعل؟",
        a: "من صفحة تسجيل الدخول اضغط «نسيت كلمة المرور»، أدخل بريدك المسجَّل وسيصلك رابط لإعادة التعيين. الرابط صالح لفترة محدودة، فإذا انتهت صلاحيته اطلب رابطاً جديداً.",
      },
      {
        q: "كيف أحمي حسابي من الاختراق؟",
        a: "فعِّل المصادقة الثنائية من إعدادات الأمان، واستخدم كلمة مرور غير مستخدمة في مواقع أخرى. يمكنك أيضاً مراجعة الأجهزة المتصلة وسجل الدخول وإنهاء أي جلسة لا تعرفها.",
      },
      {
        q: "هل يمكنني حذف حسابي؟",
        a: "نعم، من إعدادات الحساب يمكنك طلب حذف الحساب نهائياً. سيتم حذف بياناتك وفق سياسة الخصوصية، مع الاحتفاظ بالفواتير للمدة التي يفرضها القانون.",
      },
    ],
  },
  {
    id: "courses",
    icon: <BookOpen className="w-6 h-6" />,
    title: "الدورات والدراسة",
    items: [
      {
        q: "كيف أبدأ دورة جديدة؟",
        a: "تصفّح صفحة الدورات، اختر الدورة المناسبة لصفك، ثم اضغط على «انضم» أو أكمل عملية الشراء إن كانت مدفوعة. ستظهر الدورة بعد ذلك في «دوراتي» ويمكنك متابعتها من حيث توقفت.",
      },
      {
        q: "هل المحتوى متاح للتحميل أو المشاهدة بدون إنترنت؟",
        a: "الفيديوهات تُشاهد داخل المنصة فقط لحماية حقوق المدرسين. أما الملخصات والملفات المرفقة فيمكن تحميلها من صفحة الموارد أو من صفحة الدرس عندما يسمح المدرس بذلك.",
      },
      {
        q: "كيف أتابع تقدمي الدراسي؟",
        a: "لوحة التحليلات تعرض ساعات دراستك وتقدمك في كل دورة ونقاط قوتك وضعفك. كما يمكنك استخدام أدوات إدارة الوقت وقائمة المهام لتنظيم جدولك اليومي.",
      },
      {
        q: "ما الفرق بين الامتحانات واختبارات المدرسين؟",
        a: "الامتحانات هي اختبارات المنصة الدورية لقياس مستواك العام، أما اختبارات المدرسين فهي بنك أسئلة يضعه كل مدرس لدورته لتقييم فهمك للدروس الخاصة به.",
      },
    ],
  },
  {
    id: "billing",
    icon: <CreditCard className="w-6 h-6" />,
    title: "الاشتراكات والمدفوعات",
    items: [
      {
        q: "ما طرق الدفع المتاحة؟",
        a: "يمكنك الدفع ببطاقات الائتمان والخصم ومحافظ الهاتف المحمول عبر بوابة دفع معتمدة. لا نقوم بتخزين بيانات بطاقتك على خوادمنا.",
      },
      {
        q: "هل يتم تجديد الاشتراك تلقائياً؟",
        a: "الاشتراكات الدورية تُجدَّد تلقائياً في نهاية كل فترة. يمكنك إيقاف التجديد في أي وقت من صفحة الاشتراكات، ويستمر وصولك حتى نهاية الفترة المدفوعة.",
      },
      {
        q: "كيف أطلب استرداد المبلغ؟",
        a: "يمكنك طلب استرداد كامل خلال 14 يوماً من الشراء إذا لم يتجاوز تقدمك 20% من الدورة. تواصل معنا من صفحة التواصل وسنراجع الطلب. التفاصيل الكاملة في صفحة الشروط والأحكام.",
      },
      {
        q: "أين أجد فواتيري؟",
        a: "جميع الفواتير وسجل المدفوعات موجودة في صفحة الفواتير داخل حسابك، ويمكنك تحميل أي فاتورة أو طباعتها.",
      },
    ],
  },
  {
    id: "certificates",
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "الشهادات والدعم",
    items: [
      {
        q: "متى أحصل على شهادة الدورة؟",
        a: "تُصدر الشهادة تلقائياً بعد إتمام جميع دروس الدورة واجتياز اختبارها النهائي. ستجدها في صفحة الشهادات داخل حسابك مع رابط للتحقق من صحتها.",
      },
      {
        q: "كيف يتحقق الآخرون من صحة شهادتي؟",
        a: "كل شهادة تحمل رابط تحقق رسمي ورقم فريد. عند فتح الرابط تظهر بيانات الشهادة وصاحبها، ما يتيح لأي جهة التأكد من صحتها.",
      },
      {
        q: "واجهت مشكلة تقنية، كيف أحصل على مساعدة؟",
        a: `تواصل معنا من صفحة التواصل أو راسلنا على ${CONTACT.email} مع وصف المشكلة ولقطة شاشة إن أمكن. ذكر نوع المتصفح والجهاز يساعدنا على حل المشكلة أسرع.`,
      },
      {
        q: "هل يمكنني الانضمام كمدرس على المنصة؟",
        a: "نعم، من صفحة «انضم كمدرس» يمكنك تقديم طلبك مع بيانات خبرتك التعليمية. سيراجع الفريق طلبك ويتواصل معك لاستكمال الخطوات وإنشاء دوراتك.",
      },
    ],
  },
];

export default async function FaqPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqGroups.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }))
    ),
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground" dir="rtl">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/5 rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-blue-600/5 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20 lg:py-24">
        {/* ========== HERO ========== */}
        <div className="text-center mb-12 sm:mb-16 space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-5 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-primary">
            <HelpCircle className="h-4 w-4" />
            <span>مركز المساعدة</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-tight">
            الأسئلة{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              الشائعة
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            جمعنا لك إجابات أكثر الأسئلة تكراراً عن الحساب والدورات والاشتراكات والشهادات.
            لم تجد ما تبحث عنه؟ فريق الدعم جاهز لمساعدتك.
          </p>
        </div>

        {/* ========== GROUPS ========== */}
        <div className="space-y-8">
          {faqGroups.map((group) => (
            <section
              key={group.id}
              id={group.id}
              className="scroll-mt-24 rounded-2xl border border-border bg-card/40 p-6 sm:p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                  {group.icon}
                </div>
                <h2 className="text-xl sm:text-2xl font-black">{group.title}</h2>
              </div>

              <div className="space-y-3">
                {group.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-border bg-background/50 open:border-primary/30"
                  >
                    <summary className="flex items-center gap-3 cursor-pointer list-none p-4 sm:p-5 font-bold text-sm sm:text-base [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="w-5 h-5 text-primary shrink-0 group-open:rotate-180 transition-transform" />
                      <span>{item.q}</span>
                    </summary>
                    <p className="px-4 sm:px-5 pb-5 pr-12 sm:pr-14 text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* ========== STILL NEED HELP ========== */}
        <div className="mt-12 lg:mt-16 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-8 sm:p-10 text-center">
          <div className="p-3 rounded-xl bg-primary/20 border border-primary/30 text-primary w-fit mx-auto mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3">لم تجد إجابتك؟</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            راسلنا على{" "}
            <a href={`mailto:${CONTACT.email}`} className="text-primary underline" dir="ltr">
              {CONTACT.email}
            </a>{" "}
            أو اطرح سؤالك في المنتدى ليساعدك المدرسون والطلاب.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-black rounded-2xl hover:opacity-90 transition-opacity"
            >
              <Mail className="w-4 h-4" />
              تواصل مع الدعم
            </Link>
            <Link
              href="/forum"
              className="inline-flex items-center gap-2 px-8 py-4 border border-border bg-card font-bold rounded-2xl hover:border-primary/30 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              اسأل في المنتدى
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
