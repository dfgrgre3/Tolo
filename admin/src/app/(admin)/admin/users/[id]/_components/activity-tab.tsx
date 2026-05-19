"use client";

import type { UserDetails } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  History,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  ShieldCheck
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function ActivityTab({ user }: { user: UserDetails }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            جلسات المذاكرة الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {user.studySessions.length > 0 ? (
              user.studySessions.map((session) => (
                <div key={session.id} className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold">{session.subject?.name || "مذاكرة عامة"}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.startTime), "d MMMM yyyy HH:mm", { locale: ar })}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1 justify-end">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold">{session.durationMin} دقيقة</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-xs text-muted-foreground">درجة التركيز:</span>
                      <span className={`text-sm font-bold ${session.focusScore >= 80 ? 'text-success' : 'text-warning'}`}>
                        {session.focusScore}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                لا توجد جلسات مذاكرة مسجلة
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold">حالة الحساب والأمان</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-card border">
              <div className="flex items-center gap-3">
                {user.emailVerified ? (
                  <div className="h-8 w-8 rounded-full bg-success/10 text-success flex items-center justify-center">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-danger/10 text-danger flex items-center justify-center">
                    <XCircle className="h-4 w-4" />
                  </div>
                )}
                <span className="text-sm font-medium">البريد الإلكتروني</span>
              </div>
              <Badge variant={user.emailVerified ? "secondary" : "destructive"}>
                {user.emailVerified ? "موثق" : "غير موثق"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-card border">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${user.twoFactorEnabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">التحقق الثنائي</span>
              </div>
              <Badge variant={user.twoFactorEnabled ? "secondary" : "outline"}>
                {user.twoFactorEnabled ? "مفعّل" : "معطّل"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-card border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Activity className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">آخر تسجيل دخول</span>
              </div>
              <span className="text-sm font-bold">
                {user.lastLogin ? format(new Date(user.lastLogin), "d MMM yyyy", { locale: ar }) : "لم يسبق"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold">إحصائيات إضافية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">عدد التنبيهات</span>
              <span className="font-bold">{user._count.notifications}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">المهام الجاري تنفيذها</span>
              <span className="font-bold">{user._count.customGoals}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">عدد الجلسات النشطة</span>
              <span className="font-bold">{user._count.sessions}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
