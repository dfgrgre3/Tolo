"use client";

import React, { useState } from "react";
import { usePermission } from "@/hooks/use-permission";
import { useAuth } from "@/hooks/use-auth";
import TeachingLayout from "./components/TeachingLayout";
import TeachingLoading from "./loading";
import { ShieldAlert, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Tabs Panels
import DashboardOverview from "./components/DashboardOverview";
import CourseManagement from "./components/CourseManagement";
import StudentManagement from "./components/StudentManagement";
import MessagingInbox from "./components/MessagingInbox";
import ReviewsPanel from "./components/ReviewsPanel";
import AnalyticsPanel from "./components/AnalyticsPanel";
import CalendarScheduler from "./components/CalendarScheduler";
import EarningsPanel from "./components/EarningsPanel";
import SettingsPanel from "./components/SettingsPanel";

// Wizard Modal
import CourseWizard from "./components/CourseWizard";

// Hooks
import { useTeachingData, Course } from "./hooks/use-teaching-data";

export default function TeachingPage() {
  const { isContentCreator, isAuthenticated } = usePermission();
  const { user, logout, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Teacher Application Form states
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyExperience, setApplyExperience] = useState("");
  const [applyBio, setApplyBio] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Previous Request Lookup states
  const [showLookupForm, setShowLookupForm] = useState(false);
  const [lookupCode, setLookupCode] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"pending" | "error" | "none">("none");

  // Teaching dashboard data store hooks
  const {
    stats,
    activities,
    courses,
    createCourse,
    updateCourse,
    deleteCourse,
    students,
    reviews,
    replyToReview,
    conversations,
    sendMessage,
    calendarEvents,
    addCalendarEvent,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    transactions,
  } = useTeachingData(activeTab);

  const [applyName, setApplyName] = useState(user?.name || "");
  const [applyFormEmail, setApplyFormEmail] = useState(user?.email || "");

  // 1. Loading State
  if (isLoading) {
    return <TeachingLoading />;
  }

  // 2. Auth Role Guard Fallback Screen
  if (!isAuthenticated || !isContentCreator()) {
    const handleApplySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/teaching/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: applyName || user?.name || "مقدم الطلب",
            email: applyFormEmail || user?.email || "",
            experience: applyExperience,
            bio: applyBio,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setApplyCode(data.code || `TOLO-TCHR-${Math.floor(100000 + Math.random() * 900000)}`);
          setApplyEmail(data.email || applyFormEmail || user?.email || "");
          setApplySuccess(true);
        }
      } catch (err) {
        console.error("Error submitting application details", err);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleLookupSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const codeTrimmed = lookupCode.trim().toUpperCase();
      if (!codeTrimmed) return;
      try {
        const response = await fetch(`/api/teaching/apply/status?code=${encodeURIComponent(codeTrimmed)}`);
        if (response.ok) {
          const data = await response.json();
          setLookupStatus(data.status || "pending");
          setLookupMessage(data.message || "طلبك قيد المراجعة والتدقيق حالياً من قبل إدارة المنصة.");
        } else {
          setLookupStatus("error");
          setLookupMessage("كود الطلب غير صحيح أو تعذر العثور على الطلب.");
        }
      } catch (_err) {
        setLookupStatus("error");
        setLookupMessage("حدث خطأ أثناء الاتصال بالخادم. يرجى إعادة المحاولة لاحقاً.");
      }
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center" dir="rtl">
        <div className="max-w-md w-full bg-card p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          {applySuccess ? (
            <div className="space-y-4 py-4 text-center">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <ShieldAlert className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">تم تقديم طلبك بنجاح!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                شكرًا لاهتمامك بالانضمام كمعلم في منصة TOLO. تم إرسال كود المتابعة وتفاصيل طلبك إلى بريدك الإلكتروني: <strong className="text-slate-800 dark:text-slate-100">{applyEmail}</strong>
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-805 dark:text-slate-200 font-bold select-all">
                كود الطلب: {applyCode}
              </div>
              <Button
                onClick={() => {
                  window.location.href = "/";
                }}
                className="bg-primary hover:bg-primary/95 text-white rounded-xl w-full"
              >
                العودة للرئيسية
              </Button>
            </div>
          ) : showApplyForm ? (
            <form onSubmit={handleApplySubmit} className="space-y-4 text-right">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">طلب الانضمام كمعلم</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">يرجى تعبئة الحقول أدناه لتقديم طلبك للمراجعة</p>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-slate-500">الاسم الكامل</label>
                  <Input required value={applyName} onChange={(e) => setApplyName(e.target.value)} placeholder="مثال: أحمد محمد علي" className="rounded-xl border-slate-200 dark:border-slate-800 text-right text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">البريد الإلكتروني للتواصل</label>
                  <Input required type="email" value={applyFormEmail} onChange={(e) => setApplyFormEmail(e.target.value)} placeholder="example@tolo.edu" className="rounded-xl border-slate-200 dark:border-slate-800 text-right text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">سنوات الخبرة</label>
                  <Input required value={applyExperience} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplyExperience(e.target.value)} placeholder="مثال: 5 سنوات" className="rounded-xl border-slate-200 dark:border-slate-800 text-right text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold text-xs">نبذة تعريفية مختصرة</label>
                  <Textarea required value={applyBio} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApplyBio(e.target.value)} placeholder="أخبرنا عن خلفيتك الأكاديمية والتعليمية..." rows={3} className="rounded-xl border-slate-200 dark:border-slate-800 text-xs text-right" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-white rounded-xl text-xs">
                  {isSubmitting ? "جاري التقديم..." : "تقديم الطلب"}
                </Button>
                <Button type="button" disabled={isSubmitting} variant="outline" onClick={() => setShowApplyForm(false)} className="rounded-xl text-xs">إلغاء</Button>
              </div>
            </form>
          ) : showLookupForm ? (
            <form onSubmit={handleLookupSubmit} className="space-y-4 text-right">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">استعلام عن حالة الطلب</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5 font-bold">أدخل كود المتابعة للتحقق من حالة طلب انضمامك</p>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-slate-500">كود الطلب (Tracking Code)</label>
                  <Input
                    required
                    value={lookupCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLookupCode(e.target.value)}
                    placeholder="TOLO-TCHR-XXXXXX"
                    className="rounded-xl border-slate-200 dark:border-slate-800 text-center font-mono text-xs"
                  />
                </div>

                {lookupStatus !== "none" && (
                  <div className={`p-4 rounded-xl border text-xs leading-relaxed ${lookupStatus === "pending"
                      ? "bg-blue-50/50 dark:bg-blue-950/15 text-blue-600 border-blue-200/50"
                      : "bg-red-50/55 dark:bg-red-950/15 text-red-500 border-red-200/50"
                    }`}>
                    {lookupMessage}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 bg-primary text-white rounded-xl text-xs">استعلام</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowLookupForm(false);
                    setLookupStatus("none");
                    setLookupCode("");
                    setLookupMessage("");
                  }}
                  className="rounded-xl text-xs"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/20 rounded-full flex items-center justify-center mx-auto text-amber-500">
                <ShieldAlert className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">منطقة خاصة بالمعلمين فقط</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  أنت لا تملك الصلاحيات الكافية للوصول إلى لوحة تحكم المعلم. إذا كنت معلماً، يرجى التواصل مع الدعم الفني لتفعيل حسابك، أو يمكنك تقديم طلب جديد أو تتبع حالة طلبك الحالي.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => setShowApplyForm(true)}
                  className="bg-primary hover:bg-primary/95 text-white rounded-xl w-full text-xs"
                >
                  تقديم طلب الانضمام كمعلم
                </Button>
                <Button
                  onClick={() => setShowLookupForm(true)}
                  variant="outline"
                  className="border-primary/40 hover:bg-primary/5 text-primary rounded-xl w-full text-xs"
                >
                  متابعة حالة طلب سابق
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      window.location.href = "/";
                    }}
                    variant="outline"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl text-xs"
                  >
                    <Home className="w-4 h-4" />
                    الرئيسية
                  </Button>
                  {user ? (
                    <Button
                      variant="outline"
                      onClick={logout}
                      className="flex-1 rounded-xl text-xs"
                    >
                      تسجيل خروج
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.href = "/login";
                      }}
                      className="flex-1 rounded-xl text-xs"
                    >
                      تسجيل الدخول
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Course Wizard controls
  const handleCreateCourseClick = () => {
    setEditingCourse(null);
    setIsWizardOpen(true);
  };

  const handleEditCourseClick = (course: Course) => {
    setEditingCourse(course);
    setIsWizardOpen(true);
  };

  const handleSaveCourse = (courseData: Partial<Course>) => {
    if (editingCourse) {
      updateCourse({ id: editingCourse.id, data: courseData });
    } else {
      createCourse(courseData);
    }
  };

  const handleMessageStudent = (_studentId: string) => {
    // Select messages tab
    setActiveTab("messages");
  };

  // Render tab component
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardOverview
            stats={stats}
            activities={activities}
            onCreateCourse={handleCreateCourseClick}
            onScheduleSession={() => setActiveTab("calendar")}
            onSendAnnouncement={() => setActiveTab("messages")}
            user={user}
          />
        );
      case "courses":
        return (
          <CourseManagement
            courses={courses}
            onCreateCourse={handleCreateCourseClick}
            onEditCourse={handleEditCourseClick}
            onDuplicateCourse={(c) => createCourse({ ...c, title: `${c.title} (نسخة مكررة)` })}
            onDeleteCourse={deleteCourse}
          />
        );
      case "students":
        return <StudentManagement students={students} onMessageStudent={handleMessageStudent} />;
      case "messages":
        return <MessagingInbox conversations={conversations} onSendMessage={sendMessage} />;
      case "reviews":
        return <ReviewsPanel reviews={reviews} onReplyToReview={replyToReview} />;
      case "analytics":
        return <AnalyticsPanel />;
      case "earnings":
        return <EarningsPanel transactions={transactions} />;
      case "calendar":
        return <CalendarScheduler events={calendarEvents} onAddEvent={addCalendarEvent} />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <div className="text-center p-8">القسم قيد التطوير حالياً...</div>;
    }
  };

  return (
    <TeachingLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      notifications={notifications}
      markNotificationRead={markNotificationRead}
      markAllNotificationsRead={markAllNotificationsRead}
      user={user}
      logout={logout}
    >
      {renderTabContent()}

      {/* Course Creation/Editing Wizard Modal */}
      {isWizardOpen && (
        <CourseWizard
          course={editingCourse}
          onSave={handleSaveCourse}
          onClose={() => setIsWizardOpen(false)}
        />
      )}
    </TeachingLayout>
  );
}
