import type { Metadata } from "next";
import {
  Shield,
  Lock,
  Eye,
  Database,
  Mail,
  ChevronRight,
  FileText,
  Cookie,
  Gavel,
  Download,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Fingerprint,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = {
  title: "سياسة الخصوصية والشروط | TOLO",
  description:
    "سياسة الخصوصية الكاملة لمنصة TOLO التعليمية. تعرّف على كيفية جمع وحماية ومعالجة بياناتك الشخصية وحقوقك كاملاً.",
  keywords: [
    "سياسة الخصوصية",
    "TOLO",
    "حماية البيانات",
    "الخصوصية",
    "شروط الاستخدام",
    "بيانات شخصية",
    "التعليم عبر الإنترنت",
  ],
  openGraph: {
    title: "سياسة الخصوصية والشروط | TOLO",
    description:
      "سياسة الخصوصية الكاملة لمنصة TOLO التعليمية. تعرّف على كيفية جمع وحماية ومعالجة بياناتك الشخصية.",
    type: "website",
    locale: "ar_EG",
  },
};

const lastUpdated = "يونيو 2026";
const effectiveDate = "1 يوليو 2026";

const tableOfContents = [
  { id: "collect", title: "البيانات التي نجمعها" },
  { id: "use", title: "كيف نستخدم بياناتك" },
  { id: "legal-basis", title: "الأساس القانوني للمعالجة" },
  { id: "cookies", title: "ملفات تعريف الارتباط (Cookies)" },
  { id: "protect", title: "كيف نحمي بياناتك" },
  { id: "retention", title: "مدة الاحتفاظ بالبيانات" },
  { id: "share", title: "مشاركة البيانات مع أطراف ثالثة" },
  { id: "rights", title: "حقوقك" },
  { id: "children", title: "خصوصية الأطفال" },
  { id: "changes", title: "التغييرات على السياسة" },
  { id: "contact", title: "تواصل معنا" },
];

const sections = [
  {
    id: "collect",
    icon: <Database className="w-6 h-6" />,
    badge: "البيانات التي نجمعها",
    title: "البيانات التي نجمعها",
    description: "نقوم بجمع الحد الأدنى من البيانات اللازمة لتقديم خدمة تعليمية متميزة وآمنة.",
    content: [
      {
        title: "معلومات الحساب",
        items: [
          "الاسم الكامل والبريد الإلكتروني عند إنشاء الحساب.",
          "كلمة المرور - مخزنة بشكل مشفر باستخدام bcrypt ولا يمكن لأحد الاطلاع عليها.",
          "صورة الملف الشخصي (اختياري) - يتم تخزينها في خدمة تخزين سحابي آمن.",
          "رقم الهاتف (اختياري) - للمصادقة الثنائية واستعادة الحساب.",
        ],
      },
      {
        title: "بيانات الاستخدام التعليمي",
        items: [
          "الدورات والمسارات التعليمية التي تشاهدها وتقدمك فيها.",
          "نقاط XP والمستويات والإنجازات في نظام التلعيب (Gamification).",
          "إجاباتك في الاختبارات والتمارين التفاعلية.",
          "الملاحظات والمراجعات التي تكتبها على المحتوى التعليمي.",
        ],
      },
      {
        title: "بيانات التقنية والجهاز",
        items: [
          "نوع المتصفح وإصداره ونظام التشغيل.",
          "عنوان IP - لأغراض الأمان ومنع الاحتيال.",
          "حجم الشاشة ودقتها لتحسين تجربة العرض.",
          "اللغة المفضلة والإعدادات المحلية.",
        ],
      },
    ],
  },
  {
    id: "use",
    icon: <Eye className="w-6 h-6" />,
    badge: "كيف نستخدم بياناتك",
    title: "كيف نستخدم بياناتك",
    description: "نستخدم بياناتك لتقديم وتحسين تجربتك التعليمية بشكل مستمر.",
    content: [
      {
        title: "تقديم الخدمات التعليمية",
        items: [
          "تخصيص المحتوى التعليمي حسب مستواك وتقدمك.",
          "توصية بدورات ومسارات تعليمية مناسبة لك.",
          "تتبع تقدمك الدراسي وعرض لوحة الإنجازات.",
        ],
      },
      {
        title: "تحسين المنصة وتطويرها",
        items: [
          "تحليل أنماط الاستخدام لفهم كيفية تحسين المحتوى.",
          "اختبار A/B لتحسين واجهة المستخدم وتجربة التعلم.",
          "جمع ملاحظاتك لتحسين جودة المحتوى التعليمي.",
        ],
      },
      {
        title: "الأمان والحماية",
        items: [
          "الكشف عن الأنشطة المشبوهة ومنع الاحتيال.",
          "المصادقة الثنائية لحماية حسابك.",
          "مراقبة الاختراقات الأمنية المحتملة.",
        ],
      },
    ],
  },
  {
    id: "legal-basis",
    icon: <Gavel className="w-6 h-6" />,
    badge: "الأساس القانوني",
    title: "الأساس القانوني لمعالجة البيانات",
    description: "نعالج بياناتك بناءً على أسس قانونية واضحة وفقاً للوائح حماية البيانات.",
    content: [
      {
        title: "أساسيات المعالجة",
        items: [
          "<strong>العقد</strong>: معالجة بياناتك ضرورية لتنفيذ عقد تقديم الخدمات التعليمية.",
          "<strong>الموافقة</strong>: نحصل على موافقتك الصريحة قبل جمع بيانات حساسة أو إرسال مواد تسويقية.",
          "<strong>المصلحة المشروعة</strong>: نستخدم بياناتك لتحسين المنصة وحماية أمنها ولمنع الاحتيال.",
          "<strong>الالتزام القانوني</strong>: قد نعالج بياناتك للامتثال للالتزامات القانونية المنطبقة.",
        ],
      },
    ],
  },
  {
    id: "cookies",
    icon: <Cookie className="w-6 h-6" />,
    badge: "ملفات تعريف الارتباط",
    title: "ملفات تعريف الارتباط (Cookies)",
    description: "نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتقديم محتوى مخصص.",
    content: [
      {
        title: "أنواع الكوكيز التي نستخدمها",
        items: [
          "<strong>الكوكيز الأساسية (Essential)</strong>: ضرورية لتشغيل المنصة، مثل الحفاظ على حالة تسجيل الدخول.",
          "<strong>كوكيز الأداء (Performance)</strong>: تساعدنا على فهم كيفية استخدامك للمنصة لتحسينها.",
          "<strong>كوكيز الوظائف (Functional)</strong>: تذكر تفضيلاتك مثل اللغة والإعدادات.",
          "<strong>كوكيز التسويق (Marketing)</strong>: تُستخدم فقط بموافقتك لعرض محتوى ذي صلة.",
        ],
      },
      {
        title: "إدارة الكوكيز",
        items: [
          "يمكنك التحكم في الكوكيز من إعدادات المتصفح في أي وقت.",
          "تعطيل الكوكيز الأساسية قد يؤثر على وظائف المنصة الأساسية.",
          "نحترم تفضيلات Do Not Track (DNT) في متصفحك.",
        ],
      },
    ],
  },
  {
    id: "protect",
    icon: <Lock className="w-6 h-6" />,
    badge: "حماية البيانات",
    title: "كيف نحمي بياناتك",
    description: "نستخدم أحدث معايير الأمان لحماية بياناتك من الوصول غير المصرح به.",
    content: [
      {
        title: "إجراءات أمنية متعددة الطبقات",
        items: [
          "<strong>تشفير SSL/TLS</strong>: جميع البيانات المنقولة بين جهازك وخوادمنا مشفرة بالكامل.",
          "<strong>تشفير كلمات المرور</strong>: لا نخزن كلمات المرور بشكل نصي - نستخدم bcrypt مع Salt.",
          "<strong>التحكم في الوصول</strong>: موظفونا لديهم صلاحيات محدودة حسب الحاجة فقط.",
          "<strong>المراجعات الأمنية</strong>: نجري فحوصات اختراق دورية للكشف عن الثغرات.",
          "<strong>مراقبة 24/7</strong>: نظام مراقبة آلي للكشف عن الأنشطة غير الاعتيادية.",
        ],
      },
    ],
  },
  {
    id: "retention",
    icon: <Clock className="w-6 h-6" />,
    badge: "مدة الاحتفاظ",
    title: "مدة الاحتفاظ بالبيانات",
    description: "نحتفظ ببياناتك فقط للمدة اللازمة لتقديم الخدمات أو للامتثال للالتزامات القانونية.",
    content: [
      {
        title: "فترات الاحتفاظ",
        items: [
          "<strong>بيانات الحساب النشط</strong>: نحتفظ بها طالما حسابك نشط.",
          "<strong>بيانات الاستخدام</strong>: 24 شهراً من آخر نشاط لك.",
          "<strong>بيانات الدفع</strong>: 7 سنوات للامتثال للالتزامات الضريبية والمحاسبية.",
          "<strong>سجلات الأمان</strong>: 12 شهراً لأغراض التدقيق الأمني.",
          "<strong>الحسابات المحذوفة</strong>: نحتفظ بنسخة احتياطية لمدة 30 يوماً بعد الحذف.",
        ],
      },
    ],
  },
  {
    id: "share",
    icon: <Share2 className="w-6 h-6" />,
    badge: "مشاركة البيانات",
    title: "مشاركة البيانات مع أطراف ثالثة",
    description: "نشارك بياناتك فقط عند الضرورة ومع شركاء موثوقين.",
    content: [
      {
        title: "متى نشارك بياناتك؟",
        items: [
          "لا نبيع بياناتك أبداً لأي طرف ثالث لأغراض تجارية.",
          "نشارك بيانات محدودة مع مزودي خدمات - بوابات الدفع، خدمات التخزين السحابي، تحليلات.",
          "قد نكشف عن بيانات إذا طُلب ذلك قانونياً بأمر قضائي رسمي.",
          "في حالة الاندماج أو الاستحواذ، سنُخطرك قبل نقل أي بيانات وستظل السياسة سارية.",
        ],
      },
      {
        title: "مزودو الخدمات",
        items: [
          "بوابات الدفع: Paymob - معالجة المدفوعات (لا نشارك بيانات البطاقة).",
          "خدمات سحابية: استضافة آمنة ومشفرة للبيانات والملفات.",
          "خدمات تحليلات: تحسين المنصة وتجربة المستخدم.",
        ],
      },
    ],
  },
  {
    id: "rights",
    icon: <Shield className="w-6 h-6" />,
    badge: "حقوقك",
    title: "حقوقك المتعلقة ببياناتك",
    description: "لديك حقوق كاملة للتحكم في بياناتك الشخصية في أي وقت.",
    content: [
      {
        title: "حقوقك كاملة",
        items: [
          '<strong>الوصول</strong>: طلب نسخة من جميع بياناتك المخزنة لدينا عبر <a href="/contact" class="text-primary underline hover:text-primary/80 transition-colors">صفحة التواصل</a>.',
          "<strong>التصحيح</strong>: تحديث أو تصحيح أي معلومات غير دقيقة من إعدادات حسابك.",
          "<strong>الحذف</strong>: طلب حذف حسابك وجميع بياناتك - سنستجيب خلال 30 يوماً.",
          "<strong>الاعتراض</strong>: رفض بعض أنواع معالجة البيانات (مثل التسويق).",
          "<strong>نقل البيانات</strong>: طلب نقل بياناتك إلى مزود آخر بصيغة قابلة للقراءة.",
          "<strong>سحب الموافقة</strong>: سحب موافقتك على معالجة البيانات في أي وقت.",
        ],
      },
    ],
  },
  {
    id: "children",
    icon: <Fingerprint className="w-6 h-6" />,
    badge: "خصوصية الأطفال",
    title: "خصوصية الأطفال",
    description: "نحن ملتزمون بحماية خصوصية الأطفال دون سن 18 عاماً.",
    content: [
      {
        title: "حماية القُصّر",
        items: [
          "خدماتنا متاحة للمستخدمين من جميع الأعمار، ولكن يجب على من هم دون 18 عاماً الحصول على موافقة ولي الأمر.",
          "لا نجمع بيانات من الأطفال دون سن 13 عاماً عن قصد.",
          "إذا علمنا أننا جمعنا بيانات من طفل دون السن القانونية، سنحذفها فوراً.",
          "نشجع الآباء والأوصياء على مراقبة استخدام أطفالهم للمنصة.",
        ],
      },
    ],
  },
  {
    id: "changes",
    icon: <RefreshCw className="w-6 h-6" />,
    badge: "التحديثات",
    title: "التغييرات على هذه السياسة",
    description: "قد نقوم بتحديث هذه السياسة من وقت لآخر لتعكس التغييرات في ممارساتنا.",
    content: [
      {
        title: "كيف نُعلمك بالتغييرات؟",
        items: [
          "سنُعلمك بأي تغييرات جوهرية عبر البريد الإلكتروني المسجل.",
          "سننشر إشعاراً على المنصة قبل 30 يوماً من تطبيق التغييرات.",
          "نشجعك على مراجعة هذه الصفحة بشكل دوري.",
          "تاريخ آخر تحديث موجود في أعلى الصفحة للرجوع إليه.",
        ],
      },
    ],
  },
];

export default function PrivacyPage() {
  const currentDate = "يونيو 2026";

  return (
    <div className="relative min-h-screen bg-background text-foreground" dir="rtl">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/5 rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-blue-600/5 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20 lg:py-24">
        {/* ========== HERO HEADER ========== */}
        <div className="text-center mb-12 sm:mb-16 lg:mb-20 space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-5 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-primary">
            <Shield className="h-4 w-4" />
            <span>ميثاق الخصوصية</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter leading-tight">
            سياسة{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              الخصوصية
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-3xl mx-auto leading-relaxed">
            خصوصيتك هي ميثاق شرف بيننا وبينك. نؤمن بأن بياناتك ملك لك وحدك، ونحن هنا لحمايتها
            بأعلى معايير الأمان والشفافية. هذه السياسة تشرح بالتفصيل كيف نجمع، نستخدم، ونحمي
            بياناتك الشخصية.
          </p>

          {/* Metadata pills */}
          <div className="flex flex-wrap justify-center gap-3 text-xs sm:text-sm font-bold">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
              <FileText className="h-3.5 w-3.5" />
              آخر تحديث: {currentDate}
            </span>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <CheckCircle className="h-3.5 w-3.5" />
              ساري من: {effectiveDate}
            </span>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              وقت القراءة: ٨ دقائق
            </span>
          </div>
        </div>

        {/* ========== EXECUTIVE SUMMARY ========== */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 sm:p-8 lg:p-10 mb-10 lg:mb-12">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 shrink-0">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                الخلاصة السريعة
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                {[
                  "لا نبيع بياناتك لأي طرف ثالث - نهائياً.",
                  "لا نشارك بياناتك إلا لتشغيل الخدمة وتحسينها فقط.",
                  "تحكم كامل في بياناتك: تصحيح، حذف، تصدير في أي وقت.",
                  "جميع البيانات مشفرة - نقل (SSL) وتخزين (AES-256).",
                  "نستخدم أحدث معايير الأمان العالمية لحماية معلوماتك.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm sm:text-base">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ========== TABLE OF CONTENTS ========== */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 sm:p-8 mb-10 lg:mb-12">
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
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 transition-all group"
              >
                <span className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0 group-hover:scale-110 transition-transform">
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

        {/* ========== PRIVACY SECTIONS ========== */}
        <div className="space-y-8 lg:space-y-10">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card/30 to-card/10 backdrop-blur-sm p-6 sm:p-8 lg:p-10"
            >
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                  {section.icon}
                </div>
                <div>
                  <span className="inline-block text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary mb-1">
                    {section.badge}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black">{section.title}</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    {section.description}
                  </p>
                </div>
              </div>

              {/* Section Content Blocks */}
              <div className="space-y-6">
                {section.content.map((block, bi) => (
                  <div key={bi}>
                    <h3 className="text-base sm:text-lg font-bold mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {block.title}
                    </h3>
                    <ul className="space-y-2.5">
                      {block.items.map((item, ii) => (
                        <li
                          key={ii}
                          className="flex items-start gap-3 text-sm sm:text-base text-muted-foreground leading-relaxed"
                        >
                          <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span
                            dangerouslySetInnerHTML={{
                              __html: item.replace(
                                /\*\*(.*?)\*\*/g,
                                '<strong class="text-foreground font-bold">$1</strong>'
                              ),
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* ========== CONTACT & DOWNLOAD SECTION ========== */}
        <div className="mt-12 lg:mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Card */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-8 sm:p-10 text-center">
            <div className="p-3 rounded-xl bg-primary/20 border border-primary/30 text-primary w-fit mx-auto mb-4">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">لديك سؤال؟</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              إذا كان لديك أي استفسار حول سياسة الخصوصية أو كيفية معالجة بياناتك، فريقنا جاهز
              للإجابة.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-black rounded-2xl hover:scale-105 transition-transform shadow-lg shadow-primary/25"
            >
              <Mail className="w-4 h-4" />
              تواصل مع فريق الخصوصية
            </Link>
          </div>

          {/* Download / Print Card */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-8 sm:p-10 text-center">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 w-fit mx-auto mb-4">
              <Download className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">نسخة للتحميل</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              يمكنك تحميل نسخة PDF من سياسة الخصوصية للاطلاع عليها لاحقاً أو طباعتها.
            </p>
            <PrintButton />
          </div>
        </div>

        {/* ========== DATA PROTECTION OFFICER NOTE ========== */}
        <div className="mt-8 p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-sm text-muted-foreground">
              <strong className="text-amber-400 font-black">ملاحظة مهمة:</strong> إذا كنت
              مقيماً في المنطقة الاقتصادية الأوروبية (EEA) أو المملكة المتحدة، لديك حقوق
              إضافية بموجب اللائحة العامة لحماية البيانات (GDPR). يمكنك التواصل مع مسؤول
              حماية البيانات لدينا على{" "}
              <a href="mailto:dpo@tolo.com" className="text-primary underline">
                dpo@tolo.com
              </a>{" "}
              لممارسة حقوقك.
            </div>
          </div>
        </div>

        {/* ========== FOOTER NOTE ========== */}
        <div className="mt-12 text-center text-xs sm:text-sm text-muted-foreground border-t border-border pt-8">
          <p className="font-bold">
            © {new Date().getFullYear()} TOLO. جميع الحقوق محفوظة.
          </p>
          <p className="mt-1">
            آخر تحديث: {currentDate} | سياسة الخصوصية هذه منسجمة مع{" "}
            <a
              href="https://gdpr.eu/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              GDPR
            </a>{" "}
            و{" "}
            <a
              href="https://consumerprotection.gov.eg/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              قوانين حماية المستهلك المصرية
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}