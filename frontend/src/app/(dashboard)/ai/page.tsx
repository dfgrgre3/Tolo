"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, Suspense, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Loader2, Bot, FileText, CalendarDays, BookOpenText, PenLine,
  Search, Lightbulb, Sparkles, GraduationCap,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIWorkspaceProvider, useAIWorkspace } from './context/AIWorkspaceContext';
import { AI_SUBJECTS, AI_YEARS } from './components/ai-shared';

const AIAssistant = dynamic(() => import('./components/AIAssistant'), { ssr: false, loading: () => <TabSkeleton /> });
const ExamGenerator = dynamic(() => import('./components/ExamGenerator'), { ssr: false, loading: () => <TabSkeleton /> });
const TeacherSearch = dynamic(() => import('./components/TeacherSearch'), { ssr: false, loading: () => <TabSkeleton /> });
const TipsGenerator = dynamic(() => import('./components/TipsGenerator'), { ssr: false, loading: () => <TabSkeleton /> });
const StudyPlanner = dynamic(() => import('./features/StudyPlanner'), { ssr: false, loading: () => <TabSkeleton /> });
const LessonSummarizer = dynamic(() => import('./features/LessonSummarizer'), { ssr: false, loading: () => <TabSkeleton /> });
const EssayGrader = dynamic(() => import('./features/EssayGrader'), { ssr: false, loading: () => <TabSkeleton /> });

function TabSkeleton() {
  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6" dir="rtl">
      <div className="h-6 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded-lg bg-muted" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> جاري تحميل الأداة...
      </div>
    </div>
  );
}

type TabId = 'assistant' | 'exam' | 'planner' | 'summarizer' | 'grader' | 'teachers' | 'tips';
const VALID_TABS: TabId[] = ['assistant', 'exam', 'planner', 'summarizer', 'grader', 'teachers', 'tips'];

const TABS: { id: TabId; label: string; desc: string; icon: typeof Bot }[] = [
  { id: 'assistant', label: 'المساعد', desc: 'حوار شرح وإجابة', icon: Bot },
  { id: 'exam', label: 'الاختبارات', desc: 'امتحان مخصص', icon: FileText },
  { id: 'planner', label: 'خطة المذاكرة', desc: 'جدول ذكي', icon: CalendarDays },
  { id: 'summarizer', label: 'تلخيص الدروس', desc: 'نقاط + خريطة', icon: BookOpenText },
  { id: 'grader', label: 'تصحيح الإجابات', desc: 'تقييم لغوي', icon: PenLine },
  { id: 'teachers', label: 'المعلمون', desc: 'بحث وقنوات', icon: Search },
  { id: 'tips', label: 'نصائح المذاكرة', desc: 'تحسين الأداء', icon: Lightbulb },
];

export default function AILearningPage() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<TabId>('assistant');

  useEffect(() => {
    if (isLoading || user) return;
    const redirectTarget = pathname || '/ai';
    router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [isLoading, pathname, router, user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-muted-foreground">جاري تحميل مساعد المذاكرة...</p>
        </div>
      </div>
    );
  }

  return (
    <AIWorkspaceProvider>
      <Suspense fallback={null}>
        <AIWorkspace selectedTab={selectedTab} onTabChange={setSelectedTab} />
      </Suspense>
    </AIWorkspaceProvider>
  );
}

function AIWorkspace({ selectedTab, onTabChange }: { selectedTab: TabId; onTabChange: (tab: TabId) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { context, setContext } = useAIWorkspace();

  const requestedTab = searchParams.get('tab') as TabId | null;
  const activeTab: TabId = requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : selectedTab;

  const handleTabChange = (tab: string) => {
    const next = (VALID_TABS.includes(tab as TabId) ? tab : 'assistant') as TabId;
    onTabChange(next);
    router.replace(`${pathname}?tab=${next}`, { scroll: false });
  };

  const activeMeta = useMemo(() => TABS.find((t) => t.id === activeTab)!, [activeTab]);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Keep the active tab visible when it changes (mobile scroll) + on mount
  useEffect(() => {
    activeBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-bl from-primary/15 via-card to-card p-6 sm:p-10">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-1/4 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                منصة ثناوي — الذكاء الاصطناعي التعليمي
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
                مساعدك الدراسي الذكي
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                مكان واحد للفهم والتدريب والمراجعة. اطرح سؤالاً، لخّص درساً،
                نظّم وقتك، أو أنشئ اختباراً يناسب مستواك ومنهجك — والسياق (المادة والسنة) محفوظ تلقائياً لكل الأدوات.
              </p>
            </div>
          </div>

          {/* Context bar */}
          <div className="relative mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-background/70 p-4 backdrop-blur sm:grid-cols-3">
            <div>
              <span className="mb-1.5 block text-xs font-bold text-muted-foreground">المادة الحالية</span>
              <Select value={context.subject ?? ""} onValueChange={(v) => setContext({ subject: v || undefined })}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="اختر المادة (تُستخدم في كل الأدوات)" />
                </SelectTrigger>
                <SelectContent>
                  {AI_SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-bold text-muted-foreground">السنة الدراسية</span>
              <Select value={context.year ?? ""} onValueChange={(v) => setContext({ year: v || undefined })}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="اختر السنة الدراسية" />
                </SelectTrigger>
                <SelectContent>
                  {AI_YEARS.map((y) => (
                    <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex w-full items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-xs font-bold text-primary ring-1 ring-primary/20">
                <activeMeta.icon className="h-4 w-4 shrink-0" />
                الأداة النشطة: {activeMeta.label} — {activeMeta.desc}
              </div>
            </div>
          </div>
        </header>

        {/* Tabs — sticky, horizontally scrollable pills */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-5">
          <div className="sticky top-2 z-20 -mx-1 bg-background/85 px-1 py-2 backdrop-blur-md">
            <TabsList className="no-scrollbar flex h-auto w-full items-stretch justify-start gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    ref={isActive ? activeBtnRef : undefined}
                    title={`${tab.label} — ${tab.desc}`}
                    aria-label={`${tab.label}: ${tab.desc}`}
                    className={`relative flex min-w-[118px] flex-1 snap-start flex-col items-center gap-0.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all sm:min-w-[132px] ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    } data-[state=active]:bg-primary data-[state=active]:text-primary-foreground`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      {tab.label}
                    </span>
                    <span className={`hidden text-[10px] font-medium leading-none lg:block ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/80'}`}>
                      {tab.desc}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="assistant" className="mt-0 outline-none">
            <AIAssistant
              initialMessage="أهلاً بك! أنا مساعدك الدراسي. أخبرني بالصف والمادة والدرس، وسأساعدك بالشرح أو التلخيص أو التدريب. بماذا نبدأ اليوم؟"
              placeholder="اكتب سؤالك هنا... مثال: اشرح لي قانون أوم بأمثلة"
              title="المحادثة الدراسية"
            />
          </TabsContent>

          <TabsContent value="exam" className="mt-0 outline-none">
            <ExamGenerator subjects={AI_SUBJECTS} years={[1, 2, 3]} className="border-border bg-card shadow-sm" />
          </TabsContent>

          <TabsContent value="planner" className="mt-0 outline-none">
            <StudyPlanner />
          </TabsContent>

          <TabsContent value="summarizer" className="mt-0 outline-none">
            <LessonSummarizer />
          </TabsContent>

          <TabsContent value="grader" className="mt-0 outline-none">
            <EssayGrader />
          </TabsContent>

          <TabsContent value="teachers" className="mt-0 outline-none">
            <TeacherSearch subjects={AI_SUBJECTS} className="border-border bg-card shadow-sm" />
          </TabsContent>

          <TabsContent value="tips" className="mt-0 outline-none">
            <TipsGenerator subjects={AI_SUBJECTS} className="border-border bg-card shadow-sm" />
          </TabsContent>
        </Tabs>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          المحتوى المولّد استرشادي — راجع منهجك وكتاب المدرسة دائماً قبل الامتحان.
        </p>
      </div>
    </div>
  );
}
