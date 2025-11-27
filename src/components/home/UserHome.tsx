"use client";

import React, { Suspense, useRef } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, Flame, Target, User } from "lucide-react";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import Dashboard from "@/components/Dashboard";
import { ProgressSummary } from "@/lib/server-data-fetch";
import { User as UserType } from "@/contexts/auth-context";

interface UserHomeProps {
  user: UserType;
  summary: ProgressSummary | null;
}

export function UserHome({ user, summary }: UserHomeProps) {
  const sectionShell = "relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md";

  return (
    <Layout>
      <motion.div 
        className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Enhanced background effects */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-purple-200/20 blur-3xl" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 md:px-8 md:py-12 lg:px-10 lg:py-16">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className={`${sectionShell} bg-gradient-to-br from-white via-white/95 to-primary/5 ring-2 ring-primary/20 shadow-xl`}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 rounded-3xl" />
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-lg ring-4 ring-primary/20"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <User className="h-8 w-8" />
                    </motion.div>
                    <div>
                      <motion.h2 
                        className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        مرحباً {user.name || user.email}
                      </motion.h2>
                      <p className="text-sm text-muted-foreground mt-1">لوحة التحكم الشخصية - ابدأ رحلتك التعليمية</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700 border-green-500/30 shadow-sm px-4 py-1.5">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      مسجل دخول
                    </Badge>
                  </div>
                </div>
                
                {/* Quick Stats Preview */}
                {summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6"
                  >
                    <Card className="border-primary/20 bg-gradient-to-br from-blue-50 to-blue-100/50">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">وقت الدراسة</p>
                            <p className="text-xl font-bold text-blue-700">
                              {Math.round(summary.totalMinutes / 60)}س
                            </p>
                          </div>
                          <Clock className="h-8 w-8 text-blue-500 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-primary/20 bg-gradient-to-br from-purple-50 to-purple-100/50">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">المهام</p>
                            <p className="text-xl font-bold text-purple-700">
                              {summary.tasksCompleted}
                            </p>
                          </div>
                          <CheckCircle2 className="h-8 w-8 text-purple-500 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-primary/20 bg-gradient-to-br from-orange-50 to-orange-100/50">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">أيام متتالية</p>
                            <p className="text-xl font-bold text-orange-700">
                              {summary.streakDays}
                            </p>
                          </div>
                          <Flame className="h-8 w-8 text-orange-500 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-primary/20 bg-gradient-to-br from-green-50 to-green-100/50">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">نسبة الالتزام</p>
                            <p className="text-xl font-bold text-green-700">
                              {summary.averageFocus}%
                            </p>
                          </div>
                          <Target className="h-8 w-8 text-green-500 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Dashboard Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Suspense fallback={<SkeletonLoader className="h-64 rounded-lg" />}>
              <Dashboard />
            </Suspense>
          </motion.div>
        </div>
      </motion.div>
    </Layout>
  );
}
