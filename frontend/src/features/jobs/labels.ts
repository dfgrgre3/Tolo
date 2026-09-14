/**
 * Jobs module display strings and enum → label maps.
 *
 * The app currently renders Arabic directly in components (there is no i18n
 * runtime wired up — `src/messages/` exists but nothing consumes it). Rather
 * than scatter Arabic literals across a dozen new files, every user-visible
 * string in this module is collected here. When a translation runtime does
 * land, this single file is the extraction point and no component has to
 * change shape.
 */
import type {
  EmploymentType,
  ExperienceLevel,
  JobApplicationStatus,
  SalaryPeriod,
  WorkplaceType,
} from '@/types/job';

export const employmentTypeLabels: Record<EmploymentType, string> = {
  FULL_TIME: 'دوام كامل',
  PART_TIME: 'دوام جزئي',
  CONTRACT: 'عقد',
  TEMPORARY: 'مؤقت',
  INTERNSHIP: 'تدريب',
  FREELANCE: 'عمل حر',
};

export const workplaceTypeLabels: Record<WorkplaceType, string> = {
  REMOTE: 'عن بُعد',
  HYBRID: 'هجين',
  ON_SITE: 'من المقر',
};

export const experienceLevelLabels: Record<ExperienceLevel, string> = {
  ENTRY: 'مبتدئ',
  JUNIOR: 'خبرة قليلة',
  MID: 'متوسط',
  SENIOR: 'خبير',
  LEAD: 'قائد فريق',
  MANAGER: 'مدير',
  DIRECTOR: 'مدير تنفيذي',
};

export const salaryPeriodLabels: Record<SalaryPeriod, string> = {
  HOURLY: 'بالساعة',
  MONTHLY: 'شهريًا',
  YEARLY: 'سنويًا',
};

export const applicationStatusLabels: Record<JobApplicationStatus, string> = {
  APPLIED: 'تم التقديم',
  UNDER_REVIEW: 'قيد المراجعة',
  SHORTLISTED: 'القائمة المختصرة',
  INTERVIEW: 'مقابلة',
  ASSESSMENT: 'تقييم',
  OFFER: 'عرض عمل',
  HIRED: 'تم التعيين',
  REJECTED: 'مرفوض',
  WITHDRAWN: 'تم السحب',
};

/**
 * Badge colour per application status, expressed with the Tailwind tokens the
 * rest of the app uses. Terminal-negative states are muted rather than red-
 * alarming, since a rejection is information, not an error the user caused.
 */
export const applicationStatusStyles: Record<JobApplicationStatus, string> = {
  APPLIED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  UNDER_REVIEW: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  SHORTLISTED: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  INTERVIEW: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  ASSESSMENT: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  OFFER: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  HIRED: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300',
  REJECTED: 'bg-muted text-muted-foreground',
  WITHDRAWN: 'bg-muted text-muted-foreground',
};

export const sortLabels: Record<string, string> = {
  relevance: 'الأكثر صلة',
  newest: 'الأحدث',
  salary_desc: 'الراتب: من الأعلى',
  salary_asc: 'الراتب: من الأقل',
};

export const datePostedLabels: Record<number, string> = {
  1: 'آخر 24 ساعة',
  3: 'آخر 3 أيام',
  7: 'آخر 7 أيام',
  30: 'آخر 30 يومًا',
};

export const jobsStrings = {
  // Navigation
  jobs: 'الوظائف',
  overview: 'نظرة عامة',
  findJobs: 'ابحث عن وظيفة',
  savedJobs: 'الوظائف المحفوظة',
  myApplications: 'طلباتي',
  companies: 'الشركات',

  // Overview
  welcome: 'مرحبًا بك في الوظائف',
  welcomeSubtitle: 'ابحث عن فرصتك القادمة وتابع طلباتك في مكان واحد.',
  applied: 'طلبات مقدمة',
  interviews: 'مقابلات',
  offers: 'عروض عمل',
  saved: 'محفوظة',
  latestJobs: 'أحدث الوظائف',
  browseAll: 'تصفح كل الوظائف',

  // Search
  searchPlaceholder: 'المسمى الوظيفي، المهارة، أو الشركة',
  locationPlaceholder: 'المدينة أو الدولة',
  search: 'بحث',
  filters: 'الفلاتر',
  clearFilters: 'مسح الفلاتر',
  applyFilters: 'تطبيق',
  sortBy: 'ترتيب حسب',
  resultsCount: (n: number) => `${n.toLocaleString('ar-EG')} وظيفة`,
  remoteOnly: 'عن بُعد فقط',
  jobType: 'نوع الوظيفة',
  workplace: 'مكان العمل',
  experience: 'مستوى الخبرة',
  datePosted: 'تاريخ النشر',
  category: 'المجال',
  salaryRange: 'نطاق الراتب',

  // Job card / detail
  save: 'حفظ',
  unsave: 'إلغاء الحفظ',
  share: 'مشاركة',
  apply: 'تقديم',
  applyNow: 'قدّم الآن',
  alreadyApplied: 'تم التقديم',
  applyClosed: 'التقديم مغلق',
  expired: 'منتهية',
  closed: 'مغلقة',
  featured: 'مميزة',
  verified: 'موثقة',
  salaryHidden: 'الراتب غير معلن',
  postedAt: 'نُشرت',
  aboutRole: 'عن الوظيفة',
  responsibilities: 'المهام والمسؤوليات',
  requirements: 'المتطلبات',
  preferredQualifications: 'مؤهلات مفضلة',
  benefits: 'المزايا',
  skills: 'المهارات',
  aboutCompany: 'عن الشركة',
  similarJobs: 'وظائف مشابهة',
  jobSummary: 'ملخص الوظيفة',
  applicationDeadline: 'آخر موعد للتقديم',
  openPositions: 'وظائف متاحة',

  // Apply flow
  applyTitle: 'التقديم على الوظيفة',
  contactInfo: 'بيانات التواصل',
  resume: 'السيرة الذاتية',
  resumeUrl: 'رابط السيرة الذاتية',
  coverLetter: 'خطاب التقديم',
  phone: 'رقم الهاتف',
  email: 'البريد الإلكتروني',
  review: 'مراجعة',
  submit: 'إرسال الطلب',
  submitting: 'جارٍ الإرسال...',
  back: 'رجوع',
  next: 'التالي',
  applySuccess: 'تم إرسال طلبك بنجاح',
  viewApplication: 'عرض الطلب',

  // Applications
  applicationsTitle: 'طلبات التوظيف',
  all: 'الكل',
  appliedOn: 'تاريخ التقديم',
  withdraw: 'سحب الطلب',
  withdrawing: 'جارٍ السحب...',
  withdrawConfirmTitle: 'سحب الطلب؟',
  withdrawConfirmBody:
    'سيتم إبلاغ جهة التوظيف بسحب طلبك، ولن تتمكن من التقديم على هذه الوظيفة مرة أخرى.',
  cancel: 'إلغاء',
  confirmWithdraw: 'تأكيد السحب',
  timeline: 'مسار الطلب',

  // States
  loading: 'جارٍ التحميل...',
  emptyJobsTitle: 'لا توجد وظائف مطابقة',
  emptyJobsBody: 'جرّب توسيع نطاق البحث أو إزالة بعض الفلاتر.',
  emptySavedTitle: 'لا توجد وظائف محفوظة',
  emptySavedBody: 'احفظ الوظائف التي تهمك لتجدها هنا لاحقًا.',
  emptyApplicationsTitle: 'لم تقدّم على أي وظيفة بعد',
  emptyApplicationsBody: 'ابدأ بالبحث عن وظيفة تناسب مهاراتك.',
  emptyCompaniesTitle: 'لا توجد شركات',
  emptyCompaniesBody: 'جرّب تعديل البحث.',
  errorTitle: 'تعذّر تحميل البيانات',
  errorBody: 'حدث خطأ أثناء الاتصال بالخادم.',
  retry: 'إعادة المحاولة',
  notFoundTitle: 'الوظيفة غير موجودة',
  notFoundBody: 'ربما تم حذف هذه الوظيفة أو انتهت صلاحيتها.',
  backToJobs: 'العودة إلى الوظائف',
  loginToContinue: 'سجّل الدخول للمتابعة',
  loginToApply: 'سجّل الدخول للتقديم',
  loginToSave: 'سجّل الدخول لحفظ الوظيفة',
} as const;
