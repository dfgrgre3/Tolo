"use client";

import React, { useState, useEffect } from "react";
import { Search, Mail, X, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Student } from "../hooks/use-teaching-data";
import { TableSkeleton } from "./Skeletons";

interface StudentManagementProps {
  students: Student[];
  isLoading?: boolean;
  onMessageStudent: (studentId: string) => void;
}

interface StudentDetailModalProps {
  student: Student;
  onClose: () => void;
  onMessage: () => void;
}

function StudentDetailModal({ student, onClose, onMessage }: StudentDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-right" dir="rtl">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 rounded-full border border-primary/20">
              <AvatarImage src={student.avatar} alt={student.name} />
              <AvatarFallback>{student.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{student.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono">{student.email}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">تاريخ الانضمام: <strong className="text-slate-700 dark:text-slate-200">{student.joinDate}</strong></span>
            <span className="text-slate-500">عدد الكورسات: <strong className="text-primary font-bold">{student.courseProgress.length}</strong></span>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">سجل الإنجاز في الكورسات:</h5>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {student.courseProgress.map((prog, i) => (
                <div key={i} className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl bg-card space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{prog.courseTitle}</span>
                    <span className="text-[10px] text-slate-400">آخر نشاط: {prog.lastActive}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={prog.progressPercent} className="h-2 flex-1 rounded-full" />
                    <span className="text-xs font-bold text-primary">{prog.progressPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            onClick={() => {
              onClose();
              onMessage();
            }}
            className="flex-1 bg-primary text-white rounded-xl text-xs flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            إرسال رسالة للطالب
          </Button>
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs">إغلاق</Button>
        </div>
      </div>
    </div>
  );
}

export default function StudentManagement({ students, isLoading = false, onMessageStudent }: StudentManagementProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in_progress">("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === "completed") {
      return s.courseProgress.some((p) => p.progressPercent === 100);
    }
    if (statusFilter === "in_progress") {
      return s.courseProgress.some((p) => p.progressPercent < 100);
    }
    return true;
  });

  const exportToCSV = () => {
    const headers = ["الاسم", "البريد الإلكتروني", "تاريخ الانضمام", "عدد الكورسات المسجلة", "متوسط التقدم"];
    const rows = filteredStudents.map((s) => {
      const avgProg = s.courseProgress.length
        ? Math.round(s.courseProgress.reduce((acc, p) => acc + p.progressPercent, 0) / s.courseProgress.length)
        : 0;
      return [
        `"${s.name}"`,
        `"${s.email}"`,
        `"${s.joinDate}"`,
        s.courseProgress.length,
        `"${avgProg}%"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `students_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">إدارة ومتابعة الطلاب</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">تابع مستويات تقدم طلابك في الكورسات وتواصل معهم مباشرة</p>
        </div>
        <Button
          onClick={exportToCSV}
          disabled={isLoading || students.length === 0}
          variant="outline"
          className="rounded-xl text-xs flex items-center gap-1.5 border-slate-200 dark:border-slate-800"
        >
          تصدير التقرير (CSV)
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
      <>
      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-card gap-4">
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === "all"
                ? "bg-primary text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            جميع الطلاب ({students.length})
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === "completed"
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            المكملين للكورس
          </button>
          <button
            onClick={() => setStatusFilter("in_progress")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === "in_progress"
                ? "bg-amber-500 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            قيد الدراسة
          </button>
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
                <TableRow key={student.id} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/30 dark:hover:bg-slate-900/10 cursor-pointer" onClick={() => setSelectedStudent(student)}>
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
                      {student.courseProgress.map((prog: { courseTitle: string; progressPercent: number }, idx: number) => (
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
                  <TableCell className="py-4 text-left" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStudent(student)}
                        className="flex items-center gap-1 rounded-xl text-[10px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        التفاصيل
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMessageStudent(student.id)}
                        className="flex items-center gap-1.5 rounded-xl text-[10px]"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        إرسال رسالة
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onMessage={() => onMessageStudent(selectedStudent.id)}
        />
      )}
      </>
      )}
    </div>
  );
}
