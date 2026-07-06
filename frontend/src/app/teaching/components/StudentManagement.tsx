"use client";

import React, { useState } from "react";
import { Search, Mail, Eye, GraduationCap, CheckCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Student } from "../hooks/use-teaching-data";

interface StudentManagementProps {
  students: Student[];
  onMessageStudent: (studentId: string) => void;
}

export default function StudentManagement({ students, onMessageStudent }: StudentManagementProps) {
  const [search, setSearch] = useState("");

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">إدارة ومتابعة الطلاب</h3>
        <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">تابع مستويات تقدم طلابك في الكورسات وتواصل معهم مباشرة</p>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-card">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم الطالب أو البريد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-right pr-9 pl-3 py-2 border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="border border-slate-250 dark:border-slate-800 rounded-2xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
              <TableHead className="text-right text-xs font-bold text-slate-500 py-3">الطالب</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-500 py-3">الكورسات المشترك بها ومستوى التقدم</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-500 py-3">تاريخ الانضمام</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-500 py-3">آخر نشاط</TableHead>
              <TableHead className="text-left text-xs font-bold text-slate-500 py-3">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center p-8 text-xs text-slate-400">لا يوجد نتائج للبحث</TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                  {/* Name and avatar */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 rounded-full">
                        <AvatarImage src={student.avatar} alt={student.name} />
                        <AvatarFallback>{student.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{student.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-450">{student.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  {/* Progress list */}
                  <TableCell className="py-4 max-w-xs">
                    <div className="space-y-3">
                      {student.courseProgress.map((prog, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span className="font-semibold truncate max-w-[200px]">{prog.courseTitle}</span>
                            <span className="font-bold">{prog.progressPercent}%</span>
                          </div>
                          <Progress value={prog.progressPercent} className="h-1.5 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  {/* Join date */}
                  <TableCell className="py-4 text-xs font-medium text-slate-500">{student.joinDate}</TableCell>
                  {/* Last active */}
                  <TableCell className="py-4 text-xs font-medium text-slate-500">
                    {student.courseProgress[0]?.lastActive || "غير نشط"}
                  </TableCell>
                  {/* Action */}
                  <TableCell className="py-4 text-left">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMessageStudent(student.id)}
                      className="flex items-center gap-1.5 rounded-xl text-[10px]"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      إرسال رسالة
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
