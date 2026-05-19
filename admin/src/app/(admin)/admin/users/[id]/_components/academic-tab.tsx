"use client";

import type { UserDetails } from "./types";
import { gradeLabels } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function AcademicTab({ user }: { user: UserDetails }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            نتائج الاختبارات الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-muted/50 text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">الاختبار</th>
                  <th className="px-6 py-4">المادة</th>
                  <th className="px-6 py-4">الدرجة</th>
                  <th className="px-6 py-4 text-center">الحالة</th>
                  <th className="px-6 py-4">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {user.examResults.length > 0 ? (
                  user.examResults.map((result) => (
                    <tr key={result.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-sm">{result.exam.title}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{result.exam.subject.name}</td>
                      <td className="px-6 py-4">
                        <span className={`text-lg font-black ${result.score >= 50 ? 'text-success' : 'text-danger'}`}>
                          {result.score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={result.score >= 50 ? "secondary" : "destructive"} className="rounded-full px-3">
                          {result.score >= 50 ? "ناجح" : "راسب"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(new Date(result.takenAt), "d MMM yyyy", { locale: ar })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                      لا توجد نتائج اختبارات مسجلة حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">بيانات التعليم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-2xl">
                <p className="text-xs text-muted-foreground mb-1">المرحلة الدراسية</p>
                <p className="font-bold">{gradeLabels[user.gradeLevel || ""] || user.gradeLevel || "غير محدد"}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-2xl">
                <p className="text-xs text-muted-foreground mb-1">نوع التعليم</p>
                <p className="font-bold">{user.educationType || "عام"}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-2xl">
                <p className="text-xs text-muted-foreground mb-1">الشعبة</p>
                <p className="font-bold">{user.section || "غير محدد"}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-2xl">
                <p className="text-xs text-muted-foreground mb-1">المدرسة</p>
                <p className="font-bold truncate" title={user.school || ""}>{user.school || "غير محدد"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">المواد المهتم بها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.interestedSubjects.length > 0 ? (
                user.interestedSubjects.map((subject, i) => (
                  <Badge key={i} variant="outline" className="px-4 py-1.5 rounded-xl border-primary/20 bg-primary/5 text-primary">
                    {subject}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground italic text-sm">لا توجد مواد مختارة</p>
              )}
            </div>
            {user.studyGoal && (
              <div className="mt-6 p-4 rounded-2xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">هدف الدراسة</p>
                <p className="text-sm italic font-medium">"{user.studyGoal}"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
