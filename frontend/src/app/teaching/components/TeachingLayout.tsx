"use client";

import React, { useState } from "react";
import TeachingSidebar from "./TeachingSidebar";
import TeachingHeader from "./TeachingHeader";
import { NotificationItem } from "../hooks/use-teaching-data";

interface TeachingLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  user: {
    name: string | null;
    avatar: string | null;
    email: string;
  } | null;
  logout: () => void;
}

export default function TeachingLayout({
  children,
  activeTab,
  setActiveTab,
  notifications,
  markNotificationRead,
  markAllNotificationsRead,
  user,
  logout,
}: TeachingLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-right" dir="rtl">
      {/* Desktop Sidebar (hidden on mobile, always visible on large screens) */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 h-full">
        <TeachingSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={() => setMobileSidebarOpen(false)} />
          
          {/* Drawer Panel */}
          <div className="relative flex flex-col w-72 h-full bg-card shadow-2xl animate-in slide-in-from-right duration-350">
            <TeachingSidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        {/* Header */}
        <TeachingHeader
          activeTab={activeTab}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          notifications={notifications}
          markNotificationRead={markNotificationRead}
          markAllNotificationsRead={markAllNotificationsRead}
          user={user}
          logout={logout}
        />

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/10 focus:outline-none">
          <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
