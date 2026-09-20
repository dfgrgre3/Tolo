"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { usePermission } from "@/features/auth/hooks/use-permission";
import { useAuth } from "@/hooks/use-auth";
import TeachingLayout from "./components/TeachingLayout";
import TeachingLoading from "./loading";
import { ShieldAlert, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { errorService } from "@/lib/logging/error-service";
import {
  fetchTeachingApplicationStatusRaw,
  submitTeachingApplicationRaw,
} from "@/features/teaching/api/teaching-gateway";

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
import { QuizManagementPanel } from "./components/QuizManagementPanel";

// Wizard Modal
import CourseWizard from "./components/CourseWizard";

// Hooks
import { useTeachingData, Course } from "./hooks/use-teaching-data";

const VALID_TABS = [
  "dashboard",
  "courses",
  "quizzes",
  "students",
  "messages",
  "reviews",
  "analytics",
  "earnings",
  "calendar",
  "settings",
] as const;

type TeachingTab = (typeof VALID_TABS)[number];

function getInitialTab(): TeachingTab {
  if (typeof window === "undefined") return "dashboard";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return VALID_TABS.includes(tab as TeachingTab) ? (tab as TeachingTab) : "dashboard";
}

export default function TeachingPage() {
  const { isContentCreator, isAuthenticated } = usePermission();
  const { user, logout, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Keep the active tab in the URL so refresh/deep-links preserve context
  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeTab === "dashboard") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", activeTab);
    }
    window.history.replaceState(null, "", url.toString());
  }, [activeTab]);

  // Teacher Application Form states
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyExperience, setApplyExperience] = useState("");
  const [applyBio, setApplyBio] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyError, setApplyError] = useState("");

  // Previous Request Lookup states
  const [showLookupForm, setShowLookupForm] = useState(false);
  const [lookupCode, setLookupCode] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"pending" | "approved" | "rejected" | "error" | "none">("none");

  // Teaching dashboard data store hooks
  const {
    stats,
    activities,
    courses,
    isCoursesLoading,
    createCourse,
    createCourseAsync,
    isCreatingCourse,
    updateCourseAsync,
    deleteCourseAsync,
    students,
    isStudentsLoading,
    reviews,
    isReviewsLoading,
    replyToReview,
    conversations,
    sendMessage,
    calendarEvents,
    addCalendarEvent,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    transactions,
    isTransactionsLoading,
    isCalendarLoading,
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
      setApplyError("");
      try {
        const data = await submitTeachingApplicationRaw<{ code?: string; email?: string }>({
          name: applyName || user?.name || "Ù…Ù‚Ø¯Ù… Ø§Ù„Ø·Ù„Ø¨",
          email: applyFormEmail || user?.email || "",
          experience: applyExperience,
          bio: applyBio,
        });
        setApplyCode(data.code || `TOLO-TCHR-${Math.floor(100000 + Math.random() * 900000)}`);
        setApplyEmail(data.email || applyFormEmail || user?.email || "");
        setApplySuccess(true);
      } catch (err) {
        errorService.logError(err, { source: "teaching:apply", severity: "medium" });
        setApplyError("ØªØ¹Ø°Ø± ØªÙ‚Ø¯ÙŠÙ… Ø§Ù„Ø·Ù„Ø¨ Ø­Ø§Ù„ÙŠØ§Ù‹ØŒ ÙŠØ±Ø¬Ù‰ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙˆØ¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©.");
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleLookupSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const codeTrimmed = lookupCode.trim().toUpperCase();
      if (!codeTrimmed) return;
      try {
        const data = await fetchTeachingApplicationStatusRaw<{ status?: string; message?: string }>(
          codeTrimmed
        );
        const nextStatus = data.status;
        setLookupStatus(
          nextStatus === "approved" || nextStatus === "rejected" || nextStatus === "error" || nextStatus === "none"
            ? nextStatus
            : "pending"
        );
        switch (data.status) {
          case "approved":
            setLookupMessage("Ù…Ø¨Ø±ÙˆÙƒ! ØªÙ…Øª Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ù‰ Ø·Ù„Ø¨Ùƒ. ÙŠÙ…ÙƒÙ†Ùƒ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù„Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ø§Ù„Ù…Ø¹Ù„Ù….");
            break;
          case "rejected":
            setLookupMessage("Ù†Ø£Ø³ÙØŒ Ù„Ù… ÙŠØªÙ… Ù‚Ø¨ÙˆÙ„ Ø·Ù„Ø¨Ùƒ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø©. ÙŠÙ…ÙƒÙ†Ùƒ Ø§Ù„ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ø§Ù„Ø¯Ø¹Ù… Ø§Ù„ÙÙ†ÙŠ Ù„Ù…Ø¹Ø±ÙØ© Ø§Ù„ØªÙØ§ØµÙŠÙ„.");
            break;
          default:
            setLookupMessage(data.message || "Ø·Ù„Ø¨Ùƒ Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØ§Ù„ØªØ¯Ù‚ÙŠÙ‚ Ø­Ø§Ù„ÙŠØ§Ù‹ Ù…Ù† Ù‚Ø¨Ù„ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØµØ©.");
        }
      } catch (_err) {
        setLookupStatus("error");
        setLookupMessage("Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø®Ø§Ø¯Ù…. ÙŠØ±Ø¬Ù‰ Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù„Ø§Ø­Ù‚Ø§Ù‹.");
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
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">ØªÙ… ØªÙ‚Ø¯ÙŠÙ… Ø·Ù„Ø¨Ùƒ Ø¨Ù†Ø¬Ø§Ø­!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Ø´ÙƒØ±Ù‹Ø§ Ù„Ø§Ù‡ØªÙ…Ø§Ù…Ùƒ Ø¨Ø§Ù„Ø§Ù†Ø¶Ù…Ø§Ù… ÙƒÙ…Ø¹Ù„Ù… ÙÙŠ Ù…Ù†ØµØ© TOLO. ØªÙ… Ø¥Ø±Ø³Ø§Ù„ ÙƒÙˆØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙˆØªÙØ§ØµÙŠÙ„ Ø·Ù„Ø¨Ùƒ Ø¥Ù„Ù‰ Ø¨Ø±ÙŠØ¯Ùƒ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ: <strong className="text-slate-800 dark:text-slate-100">{applyEmail}</strong>
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 font-bold select-all">
                ÙƒÙˆØ¯ Ø§Ù„Ø·Ù„Ø¨: {applyCode}
              </div>
              <Button
                onClick={() => {
                  window.location.href = "/";
                }}
                className="bg-primary hover:bg-primary/95 text-white rounded-xl w-full"
              >
                Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ø±Ø¦ÙŠØ³ÙŠØ©
              </Button>
            </div>
          ) : showApplyForm ? (
            <form onSubmit={handleApplySubmit} className="space-y-4 text-right">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Ø·Ù„Ø¨ Ø§Ù„Ø§Ù†Ø¶Ù…Ø§Ù… ÙƒÙ…Ø¹Ù„Ù…</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">ÙŠØ±Ø¬Ù‰ ØªØ¹Ø¨Ø¦Ø© Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø£Ø¯Ù†Ø§Ù‡ Ù„ØªÙ‚Ø¯ÙŠÙ… Ø·Ù„Ø¨Ùƒ Ù„Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©</p>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-slate-500">Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„</label>
                  <Input required value={applyName} onChange={(e) => setApplyName(e.target.value)} placeholder="Ù…Ø«Ø§Ù„: Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø¹Ù„ÙŠ" className="rounded-xl border-slate-200 dark:border-slate-800 text-right text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ù„Ù„ØªÙˆØ§ØµÙ„</label>
                  <Input required type="email" value={applyFormEmail} onChange={(e) => setApplyFormEmail(e.target.value)} placeholder="example@tolo.edu" className="rounded-xl border-slate-200 dark:border-slate-800 text-right text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Ø³Ù†ÙˆØ§Øª Ø§Ù„Ø®Ø¨Ø±Ø©</label>
                  <Input required value={applyExperience} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplyExperience(e.target.value)} placeholder="Ù…Ø«Ø§Ù„: 5 Ø³Ù†ÙˆØ§Øª" className="rounded-xl border-slate-200 dark:border-slate-800 text-right text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold text-xs">Ù†Ø¨Ø°Ø© ØªØ¹Ø±ÙŠÙÙŠØ© Ù…Ø®ØªØµØ±Ø©</label>
                  <Textarea required value={applyBio} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApplyBio(e.target.value)} placeholder="Ø£Ø®Ø¨Ø±Ù†Ø§ Ø¹Ù† Ø®Ù„ÙÙŠØªÙƒ Ø§Ù„Ø£ÙƒØ§Ø¯ÙŠÙ…ÙŠØ© ÙˆØ§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©..." rows={3} className="rounded-xl border-slate-200 dark:border-slate-800 text-xs text-right" />
                </div>
              </div>

                {applyError && (
                  <div className="p-3 bg-red-50/60 dark:bg-red-950/15 text-red-500 border border-red-200/50 rounded-xl text-xs leading-relaxed">
                    {applyError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-white rounded-xl text-xs">
                    {isSubmitting ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªÙ‚Ø¯ÙŠÙ…..." : "ØªÙ‚Ø¯ÙŠÙ… Ø§Ù„Ø·Ù„Ø¨"}
                  </Button>
                <Button type="button" disabled={isSubmitting} variant="outline" onClick={() => { setShowApplyForm(false); setApplyError(""); }} className="rounded-xl text-xs">Ø¥Ù„ØºØ§Ø¡</Button>
              </div>
            </form>
          ) : showLookupForm ? (
            <form onSubmit={handleLookupSubmit} className="space-y-4 text-right">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Ø§Ø³ØªØ¹Ù„Ø§Ù… Ø¹Ù† Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5 font-bold">Ø£Ø¯Ø®Ù„ ÙƒÙˆØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ù„Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø­Ø§Ù„Ø© Ø·Ù„Ø¨ Ø§Ù†Ø¶Ù…Ø§Ù…Ùƒ</p>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-slate-500">ÙƒÙˆØ¯ Ø§Ù„Ø·Ù„Ø¨ (Tracking Code)</label>
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
                      : lookupStatus === "approved"
                      ? "bg-emerald-50/50 dark:bg-emerald-950/15 text-emerald-600 border-emerald-200/50"
                      : lookupStatus === "rejected"
                      ? "bg-amber-50/60 dark:bg-amber-950/15 text-amber-600 border-amber-200/50"
                      : "bg-red-50/55 dark:bg-red-950/15 text-red-500 border-red-200/50"
                    }`}>
                    {lookupMessage}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 bg-primary text-white rounded-xl text-xs">Ø§Ø³ØªØ¹Ù„Ø§Ù…</Button>
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
                  Ø¥Ù„ØºØ§Ø¡
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/20 rounded-full flex items-center justify-center mx-auto text-amber-500">
                <ShieldAlert className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ù…Ù†Ø·Ù‚Ø© Ø®Ø§ØµØ© Ø¨Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† ÙÙ‚Ø·</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Ø£Ù†Øª Ù„Ø§ ØªÙ…Ù„Ùƒ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„ÙƒØ§ÙÙŠØ© Ù„Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ø§Ù„Ù…Ø¹Ù„Ù…. Ø¥Ø°Ø§ ÙƒÙ†Øª Ù…Ø¹Ù„Ù…Ø§Ù‹ØŒ ÙŠØ±Ø¬Ù‰ Ø§Ù„ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ø§Ù„Ø¯Ø¹Ù… Ø§Ù„ÙÙ†ÙŠ Ù„ØªÙØ¹ÙŠÙ„ Ø­Ø³Ø§Ø¨ÙƒØŒ Ø£Ùˆ ÙŠÙ…ÙƒÙ†Ùƒ ØªÙ‚Ø¯ÙŠÙ… Ø·Ù„Ø¨ Ø¬Ø¯ÙŠØ¯ Ø£Ùˆ ØªØªØ¨Ø¹ Ø­Ø§Ù„Ø© Ø·Ù„Ø¨Ùƒ Ø§Ù„Ø­Ø§Ù„ÙŠ.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => setShowApplyForm(true)}
                  className="bg-primary hover:bg-primary/95 text-white rounded-xl w-full text-xs"
                >
                  ØªÙ‚Ø¯ÙŠÙ… Ø·Ù„Ø¨ Ø§Ù„Ø§Ù†Ø¶Ù…Ø§Ù… ÙƒÙ…Ø¹Ù„Ù…
                </Button>
                <Button
                  onClick={() => setShowLookupForm(true)}
                  variant="outline"
                  className="border-primary/40 hover:bg-primary/5 text-primary rounded-xl w-full text-xs"
                >
                  Ù…ØªØ§Ø¨Ø¹Ø© Ø­Ø§Ù„Ø© Ø·Ù„Ø¨ Ø³Ø§Ø¨Ù‚
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
                    Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©
                  </Button>
                  {user ? (
                    <Button
                      variant="outline"
                      onClick={logout}
                      className="flex-1 rounded-xl text-xs"
                    >
                      ØªØ³Ø¬ÙŠÙ„ Ø®Ø±ÙˆØ¬
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.href = "/login";
                      }}
                      className="flex-1 rounded-xl text-xs"
                    >
                      ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„
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

  const handleSaveCourse = async (courseData: Partial<Course>) => {
    try {
      if (editingCourse) {
        await updateCourseAsync({ id: editingCourse.id, data: courseData });
        toast.success("ØªÙ… Ø­ÙØ¸ ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ø§Ù„ÙƒÙˆØ±Ø³ Ø¨Ù†Ø¬Ø§Ø­");
      } else {
        await createCourseAsync(courseData);
        toast.success("ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙƒÙˆØ±Ø³ Ø¨Ù†Ø¬Ø§Ø­");
      }
      setIsWizardOpen(false);
    } catch {
      toast.error("ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„ÙƒÙˆØ±Ø³ØŒ ÙŠØ±Ø¬Ù‰ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰");
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteCourseAsync(id);
      toast.success("ØªÙ… Ø­Ø°Ù Ø§Ù„ÙƒÙˆØ±Ø³ Ø¨Ù†Ø¬Ø§Ø­");
    } catch {
      toast.error("ØªØ¹Ø°Ø± Ø­Ø°Ù Ø§Ù„ÙƒÙˆØ±Ø³ØŒ ÙŠØ±Ø¬Ù‰ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰");
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
            isLoading={isCoursesLoading}
            onCreateCourse={handleCreateCourseClick}
            onEditCourse={handleEditCourseClick}
            onDuplicateCourse={(c) => createCourse({ ...c, title: `${c.title} (Ù†Ø³Ø®Ø© Ù…ÙƒØ±Ø±Ø©)` })}
            onDeleteCourse={handleDeleteCourse}
          />
        );
      case "quizzes":
        return <QuizManagementPanel courses={courses} />;
      case "students":
        return <StudentManagement students={students} isLoading={isStudentsLoading} onMessageStudent={handleMessageStudent} />;
      case "messages":
        return <MessagingInbox conversations={conversations} onSendMessage={sendMessage} />;
      case "reviews":
        return <ReviewsPanel reviews={reviews} isLoading={isReviewsLoading} onReplyToReview={replyToReview} />;
      case "analytics":
        return <AnalyticsPanel />;
      case "earnings":
        return <EarningsPanel transactions={transactions} isLoading={isTransactionsLoading} />;
      case "calendar":
        return <CalendarScheduler events={calendarEvents} isLoading={isCalendarLoading} onAddEvent={addCalendarEvent} />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <div className="text-center p-8">Ø§Ù„Ù‚Ø³Ù… Ù‚ÙŠØ¯ Ø§Ù„ØªØ·ÙˆÙŠØ± Ø­Ø§Ù„ÙŠØ§Ù‹...</div>;
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
          isSaving={isCreatingCourse}
          onClose={() => setIsWizardOpen(false)}
        />
      )}
    </TeachingLayout>
  );
}
