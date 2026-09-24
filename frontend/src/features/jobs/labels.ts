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
  JobPostingStatus,
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
 * Posting lifecycle labels, seen only by the employer and admins. The seeker
 * surface never renders these — a PENDING_REVIEW row is invisible to it, and
 * showing an employer-facing state to an applicant would be confusing.
 */
export const jobPostingStatusLabels: Record<JobPostingStatus, string> = {
  DRAFT: 'مسودة',
  PENDING_REVIEW: 'قيد المراجعة',
  PUBLISHED: 'منشورة',
  PAUSED: 'متوقفة مؤقتًا',
  CLOSED: 'مغلقة',
  REJECTED: 'مرفوضة',
  ARCHIVED: 'مؤرشفة',
};

export const jobPostingStatusStyles: Record<JobPostingStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_REVIEW: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  PAUSED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  CLOSED: 'bg-muted text-muted-foreground',
  REJECTED: 'bg-red-500/10 text-red-600 dark:text-red-400',
  ARCHIVED: 'bg-muted text-muted-foreground',
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
  paginationLabel: 'التنقل بين الصفحات',
  previousPage: 'السابق',
  nextPage: 'التالي',
  sortBy: 'ترتيب حسب',
  resultsCount: (n: number) => `${n.toLocaleString('ar-EG')} وظيفة`,
  jobType: 'نوع الوظيفة',
  workplace: 'مكان العمل',
  experience: 'مستوى الخبرة',
  datePosted: 'تاريخ النشر',
  salaryRange: 'نطاق الراتب',
  // Accessible names for the min/max salary inputs. The visible placeholders
  // stay as من/إلى, but screen readers need distinct names so the two inputs
  // are not announced identically.
  salaryMin: 'الحد الأدنى للراتب',
  salaryMax: 'الحد الأقصى للراتب',

  // Job card / detail
  save: 'حفظ',
  unsave: 'إلغاء الحفظ',
  share: 'مشاركة',
  applyNow: 'قدّم الآن',
  alreadyApplied: 'تم التقديم',
  applyClosed: 'التقديم مغلق',
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
  withdrawFailed: 'تعذّر سحب الطلب. حاول مرة أخرى لاحقًا.',
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
  // Each detail surface gets its own copy: a 404 means a different thing on
  // the application page than on the job page, and telling a user their job
  // was deleted when the application link was simply bad is misleading.
  applicationNotFoundTitle: 'الطلب غير موجود',
  applicationNotFoundBody: 'ربما تم سحب هذا الطلب أو حذفه، أو أن الرابط غير صحيح.',
  companyNotFoundTitle: 'الشركة غير موجودة',
  companyNotFoundBody: 'ربما تم حذف هذه الشركة، أو أن الرابط غير صحيح.',
  loginToContinue: 'سجّل الدخول للمتابعة',
  loginToApply: 'سجّل الدخول للتقديم',

  // ── Employer console ──────────────────────────────────────────
  employer: 'صاحب العمل',
  employerConsole: 'لوحة صاحب العمل',
  employerSubtitle: 'أدر شركاتك ووظائفك ومتقدميك من مكان واحد.',
  myCompanies: 'شركاتي',
  addCompany: 'إضافة شركة',
  companyName: 'اسم الشركة',
  companyIndustry: 'القطاع',
  companySize: 'حجم الشركة',
  companyLocation: 'الموقع',
  companyWebsite: 'الموقع الإلكتروني',
  foundedYear: 'سنة التأسيس',
  companyDescription: 'عن الشركة',
  saveCompany: 'حفظ الشركة',

  myJobs: 'وظائفي',
  addJob: 'إضافة وظيفة',
  jobTitle: 'المسمى الوظيفي',
  jobStatus: 'الحالة',
  applicants: 'المتقدمون',
  postedJobs: 'الوظائف المنشورة',
  activeJobs: 'الوظائف النشطة',
  draftJobs: 'المسودات',
  pendingReview: 'قيد المراجعة',
  newApplication: 'متقدم جديد',

  // Posting form
  jobFormTitle: 'تفاصيل الوظيفة',
  jobDescription: 'الوصف الوظيفي',
  jobSkills: 'المهارات المطلوبة',
  jobCategory: 'الفئة',
  jobCountry: 'الدولة',
  jobCity: 'المدينة',
  salaryCurrency: 'العملة',
  salaryPeriod: 'فترة الراتب',
  showSalary: 'إظهار الراتب',
  expiresAt: 'آخر موعد للتقديم',
  selectCompany: 'اختر الشركة',
  saveJob: 'حفظ الوظيفة',
  saving: 'جارٍ الحفظ...',
  jobSaved: 'تم حفظ الوظيفة',

  // Lifecycle
  submitForReview: 'إرسال للمراجعة',
  publishJob: 'نشر الوظيفة',
  pauseJob: 'إيقاف مؤقت',
  resumeJob: 'استئناف',
  closeJob: 'إغلاق الوظيفة',
  editJob: 'تعديل',
  duplicateJob: 'نسخ كمسودة',
  archiveJob: 'أرشفة',
  transitionFailed: 'تعذّر تغيير حالة الوظيفة.',
  underReviewNote: 'هذه الوظيفة قيد مراجعة الإدارة قبل النشر.',

  // Applicants
  applicantsTitle: 'المتقدمون للوظيفة',
  applicantName: 'الاسم',
  applicantEmail: 'البريد الإلكتروني',
  applicantPhone: 'الهاتف',
  appliedDate: 'تاريخ التقديم',
  currentStage: 'المرحلة الحالية',
  moveToStage: 'نقل إلى مرحلة',
  rejectApplicant: 'رفع الطلب',
  hireApplicant: 'توظيف',
  stageNote: 'ملاحظة',
  stageUpdated: 'تم تحديث مرحلة المتقدم',
  stageUpdateFailed: 'تعذّر تحديث مرحلة المتقدم.',
  emptyApplicantsTitle: 'لا يوجد متقدمون بعد',
  emptyApplicantsBody: 'عندما يقدّم أحد على هذه الوظيفة سيظهر هنا.',
  noApplicationsYet: 'لا توجد طلبات في هذه المرحلة',

  // Empty employer states
  emptyEmployerJobsTitle: 'لم تنشئ أي وظيفة بعد',
  emptyEmployerJobsBody: 'أضف وظيفتك الأولى لتبدأ في استقبال المتقدمين.',
  emptyCompaniesMineTitle: 'لم تنشئ أي شركة بعد',
  emptyCompaniesMineBody: 'أضف شركتك لتتمكن من نشر الوظائف باسمها.',

  // ── Dynamic filters ───────────────────────────────────────────
  // Only the two data-backed filters get a section title of their own; the
  // static enum groups reuse the labels above them.
  category: 'الفئة',
  company: 'الشركة',
  companySearchPlaceholder: 'ابحث باسم الشركة',
  companySearchHint: 'اكتب حرفين على الأقل للبحث',
  noCompanyResults: 'لا توجد شركات مطابقة',
  remoteOnly: 'عن بُعد فقط',
  clearAll: 'مسح الكل',
  /** Accessible name for the ✕ on an active-filter chip. */
  removeChip: (label: string) => `إزالة الفلتر: ${label}`,
  /** Fit badge. Shown only for 1–100 (see formatMatchScore). */
  matchPercent: (n: number) => `توافق ${n}٪`,
  salaryAtLeast: (n: number) => `الراتب من ${n}`,
  salaryAtMost: (n: number) => `الراتب حتى ${n}`,

  // ── Career profile (/jobs/profile) ───────────────────────────
  careerProfile: 'ملف الوظائف',
  editProfile: 'تعديل الملف الشخصي',
  profileSummary: 'ملخص الملف',
  emptyProfileBody: 'لا توجد بيانات لعرضها بعد — أضفها من ملفك الشخصي.',
  location: 'الموقع',
  bio: 'نبذة',
  experienceYears: 'سنوات الخبرة',
  school: 'الجهة التعليمية',
  gradeLevel: 'المستوى الدراسي',
  educationType: 'نوع التعليم',
  section: 'القسم',
  studyGoal: 'هدف الدراسة',
  subjects: 'المواد',
  /** Stated explicitly: the CV link is device-local, not synced. */
  resumeDeviceNote:
    'يُحفظ هذا الرابط على هذا الجهاز فقط ليُستخدم في تعبئة نماذج التقديم هنا؛ لا يُرسل إلى الخادم ولا يظهر على أجهزة أخرى.',
  resumeSaved: 'تم الحفظ',
  invalidUrl: 'الرابط غير صالح',

  // ── Screening questions (employer editor + apply form) ───────
  screeningQuestions: 'أسئلة التقديم',
  screeningQuestionsHint: 'تظهر هذه الأسئلة للمتقدم أثناء تعبئة الطلب.',
  addQuestion: 'إضافة سؤال',
  removeQuestion: 'حذف السؤال',
  questionPromptPlaceholder: 'اكتب نص السؤال…',
  questionRequired: 'إلزامي',
  questionOptional: 'اختياري',
  questionsMaxReached: 'وصلت إلى الحد الأقصى (١٠ أسئلة)',
  questionTooShort: 'نص السؤال قصير جدًا (٥ أحرف على الأقل)',
  questionTooLong: 'نص السؤال طويل جدًا (٣٠٠ حرف كحد أقصى)',
  questionDuplicate: 'هذا السؤال مكرر',
  answerRequired: 'الإجابة على هذا السؤال إلزامية',

  // ── Applicant screening answers (employer view) ──────────────
  applicationAnswers: 'إجابات أسئلة التقديم',
  questionId: 'معرّف السؤال',
  // Shown next to the bare id when the question was deleted after the
  // application arrived — the answer stays visible, only its label is lost.
  questionRemoved: 'لم يعد هذا السؤال موجودًا في الوظيفة',
} as const;
