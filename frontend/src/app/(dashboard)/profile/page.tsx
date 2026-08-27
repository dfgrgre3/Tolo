"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserCircle2,
  ShieldCheck,
  BellRing,
  GraduationCap,
  Lock,
  LayoutDashboard,
  History,
  Trophy,
} from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { ComponentErrorBoundary } from "@/components/ui/error-boundary";
import ProfileIdentityCard from "./_components/ProfileIdentityCard";
import AccountVerificationAlert from "./_components/AccountVerificationAlert";
import ProfileOverviewTab from "./_components/ProfileOverviewTab";
import AccountSettingsForm from "./_components/AccountSettingsForm";
import SecuritySettings from "./_components/SecuritySettings";
import NotificationPreferences from "./_components/NotificationPreferences";
import PrivacySettingsCard from "./_components/PrivacySettingsCard";
import DataExportCard from "./_components/DataExportCard";
import ActivityLog from "./_components/ActivityLog";
import AchievementsSection from "./_components/AchievementsSection";
import LearningSummarySection from "./_components/LearningSummarySection";
import { normalizeProfileTab } from "./_components/profile.constants";

/** 02 — Deep Links: sections are addressable via ?tab=; unknown values fall back. */
const TAB_ITEMS = [
  { value: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { value: "account", label: "بيانات الحساب", icon: UserCircle2 },
  { value: "security", label: "الأمان", icon: ShieldCheck },
  { value: "notifications", label: "الإشعارات", icon: BellRing },
  { value: "privacy", label: "الخصوصية", icon: Lock },
  { value: "activity", label: "النشاط", icon: History },
  { value: "achievements", label: "الإنجازات", icon: Trophy },
  { value: "learning", label: "التعلم", icon: GraduationCap },
] as const;

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function ProfilePageContent() {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = normalizeProfileTab(searchParams.get("tab"));

  function setActiveTab(tab: string) {
    router.replace(`/profile?tab=${tab}`, { scroll: false });
  }

  // Middleware already redirects guests before this renders in practice;
  // this is the client-side fallback for a session that expired in-tab.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login?redirect=/profile";
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent py-10 px-4 md:px-8 xl:px-12" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">الملف الشخصي</h1>
          <p className="text-muted-foreground">إدارة بياناتك وأمانك وتفضيلاتك من مكان واحد.</p>
        </header>

        <ComponentErrorBoundary>
          <ProfileIdentityCard />
        </ComponentErrorBoundary>

        <AccountVerificationAlert />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-2">
                <Icon className="w-4 h-4" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <ComponentErrorBoundary>
              <ProfileOverviewTab />
            </ComponentErrorBoundary>
          </TabsContent>
          <TabsContent value="account">
            <ComponentErrorBoundary>
              <AccountSettingsForm />
            </ComponentErrorBoundary>
          </TabsContent>
          <TabsContent value="security">
            <ComponentErrorBoundary>
              <SecuritySettings />
            </ComponentErrorBoundary>
          </TabsContent>
          <TabsContent value="notifications">
            <ComponentErrorBoundary>
              <NotificationPreferences />
            </ComponentErrorBoundary>
          </TabsContent>
          <TabsContent value="privacy">
            <div className="space-y-6">
              <ComponentErrorBoundary>
                <PrivacySettingsCard />
              </ComponentErrorBoundary>
              <ComponentErrorBoundary>
                <DataExportCard />
              </ComponentErrorBoundary>
            </div>
          </TabsContent>
          <TabsContent value="activity">
            <ComponentErrorBoundary>
              <ActivityLog />
            </ComponentErrorBoundary>
          </TabsContent>
          <TabsContent value="achievements">
            <ComponentErrorBoundary>
              <AchievementsSection />
            </ComponentErrorBoundary>
          </TabsContent>
          <TabsContent value="learning">
            <ComponentErrorBoundary>
              <LearningSummarySection />
            </ComponentErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ProfilePageContent />
    </Suspense>
  );
}
