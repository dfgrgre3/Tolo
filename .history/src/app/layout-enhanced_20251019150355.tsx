
import React from "react";
import { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import TopNavigation from "@/components/ui/TopNavigation";
import SidebarNavigation from "@/components/ui/SidebarNavigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "منصة التعليم المتقدمة",
  description: "منصة تعليمية متكاملة لتنظيم الوقت، متابعة التقدم، والموارد التعليمية",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 flex">
          <SidebarNavigation />
          <div className="flex-1 md:mr-64">
            <TopNavigation />
            <main className="p-6 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
