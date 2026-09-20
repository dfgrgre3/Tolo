"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  createExamRaw,
  createExamResultRaw,
  createGradeRaw,
  deleteExamRaw,
  deleteExamResultRaw,
  deleteGradeRaw,
  fetchExamResultsRaw,
  fetchGradesRaw,
  fetchTeachersRaw,
} from "@/features/courses/api/courses-gateway";
import { logger } from "@/lib/logger";

type Teacher = {
  id: string;
  name: string;
  subject: string;
  onlineUrl?: string | null;
};

type ExamResult = {
  id: string;
  score: number;
  takenAt: string;
  exam: {
    id: string;
    subject: string;
    title: string;
    year: number;
  };
  teacher?: Teacher;
};

type UserGrade = {
  id: string;
  subject: string;
  grade: number;
  maxGrade: number;
  date: string;
  notes?: string;
  isOnline: boolean;
  assignmentType: string;
  teacher?: Teacher;
};

export default function TeacherExamsPage() {
  const { isAuthenticated } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [userGrades, setUserGrades] = useState<UserGrade[]>([]);

  // Form states for adding new exam with teacher
  const [teacherId, setTeacherId] = useState("");
  const [subject, setSubject] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [isOnline, setIsOnline] = useState(false);
  const [notes, setNotes] = useState("");
  const [assignmentType, setAssignmentType] = useState("OTHER");

  useEffect(() => {
    (async () => {
      try {
        const ts = await fetchTeachersRaw<unknown>();
        // Defensive: API may return an error object (e.g. { error, status }) when the
        // backend route is missing or the proxy is misconfigured. Only set state when
        // we actually got an array back, otherwise `teachers.map` would throw.
        setTeachers(Array.isArray(ts) ? (ts as Teacher[]) : []);
      } catch (err) {
        logger.error("[TeacherExams] Failed to load teachers:", err);
        setTeachers([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        // Session-scoped: the backend resolves the user from the JWT, so no
        // ?userId= is appended (IDOR/BOLA hardening).
        const results = await fetchExamResultsRaw();
        setExamResults(Array.isArray(results) ? (results as ExamResult[]) : []);

        const grades = await fetchGradesRaw();
        setUserGrades(Array.isArray(grades) ? (grades as UserGrade[]) : []);
      } catch (err) {
        logger.error("[TeacherExams] Failed to load exam results/grades:", err);
        setExamResults([]);
        setUserGrades([]);
      }
    })();
  }, [isAuthenticated]);

  async function addTeacherExam(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated || !teacherId || !subject || !examTitle || !examDate) return;

    // This flow is 3 separate backend mutations with no server-side transaction.
    // We can't make it atomic from the client, but we can avoid leaving orphaned
    // records behind: if a later step fails, best-effort delete what already
    // succeeded (compensating actions / manual saga) before surfacing the error.
    let examId: string | undefined;
    let resultId: string | undefined;

    try {
      // First create the exam
      const exam = await createExamRaw({
        subject,
        title: examTitle,
        year: new Date(examDate).getFullYear(),
        type: "OTHER"
      });
      examId = exam?.id;

      // Then create the exam result with teacher
      const result = await createExamResultRaw({
        examId: exam.id,
        score: Number(score),
        takenAt: examDate,
        teacherId
      });
      resultId = result?.id;

      // Also add as a user grade
      await createGradeRaw({
        subject,
        grade: Number(score),
        maxGrade: Number(maxScore),
        date: examDate,
        notes,
        isOnline,
        assignmentType,
        teacherId
      });
    } catch (err) {
      logger.error("[TeacherExams] addTeacherExam failed, rolling back partial writes:", err);
      // Best-effort compensation — a failure here just gets logged, since there's
      // nothing more the client can do about an orphaned record at that point.
      if (resultId) {
        await deleteExamResultRaw(resultId).catch(() => {});
      }
      if (examId) {
        await deleteExamRaw(examId).catch(() => {});
      }
      return;
    }

    // Refresh data — defend against non-array responses (e.g. 404/502 error objects).
    const updatedResults = await fetchExamResultsRaw();
    setExamResults(Array.isArray(updatedResults) ? (updatedResults as ExamResult[]) : []);

    const updatedGrades = await fetchGradesRaw();
    setUserGrades(Array.isArray(updatedGrades) ? (updatedGrades as UserGrade[]) : []);

    // Reset form
    setTeacherId("");
    setSubject("");
    setExamTitle("");
    setExamDate("");
    setScore(0);
    setMaxScore(100);
    setIsOnline(false);
    setNotes("");
    setAssignmentType("OTHER");
  }

  async function deleteExamResult(id: string) {
    await deleteExamResultRaw(id);
    setExamResults((r) => Array.isArray(r) ? r.filter((x) => x.id !== id) : []);
  }

  async function deleteGrade(id: string) {
    await deleteGradeRaw(id);
    setUserGrades((g) => Array.isArray(g) ? g.filter((x) => x.id !== id) : []);
  }

  return (
    <div className="px-4">
				<section className="mx-auto max-w-7xl py-8 space-y-6">
				<h1 className="text-2xl md:text-3xl font-bold">امتحانات ودرجات المدرسين</h1>

				<div className="rounded-lg border p-4">
					<h2 className="font-semibold mb-2">إضافة امتحان جديد مع مدرس</h2>
					<form className="grid md:grid-cols-2 gap-3" onSubmit={addTeacherExam}>
						<select
              className="border rounded-md px-3 py-2 text-sm"
              aria-label="اختر المدرس"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}>

							<option value="">اختر المدرس</option>
							{Array.isArray(teachers) && teachers.map((t) =>
              <option key={t.id} value={t.id}>{t.subject} - {t.name}</option>
              )}
						</select>

						<select
              className="border rounded-md px-3 py-2 text-sm"
              aria-label="المادة"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}>

							<option value="">اختر المادة</option>
							<option value="MATH">رياضيات</option>
							<option value="PHYSICS">فيزياء</option>
							<option value="CHEMISTRY">كيمياء</option>
							<option value="ARABIC">لغة عربية</option>
							<option value="ENGLISH">لغة إنجليزية</option>
						</select>

						<input
              className="border rounded-md px-3 py-2 text-sm"
              placeholder="عنوان الامتحان"
              aria-label="عنوان الامتحان"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)} />


						<input
              type="date"
              className="border rounded-md px-3 py-2 text-sm"
              aria-label="تاريخ الامتحان"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)} />


						<div className="flex gap-2">
							<input
                type="number"
                min={0}
                className="border rounded-md px-3 py-2 text-sm flex-1"
                placeholder="الدرجة"
                aria-label="الدرجة"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))} />

							<input
                type="number"
                min={1}
                className="border rounded-md px-3 py-2 text-sm flex-1"
                placeholder="الدرجة العظمى"
                aria-label="الدرجة العظمى"
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))} />

						</div>

						<select
              className="border rounded-md px-3 py-2 text-sm"
              aria-label="نوع التقييم"
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value)}>

							<option value="EXAM">امتحان</option>
							<option value="QUIZ">اختبار قصير</option>
							<option value="HOMEWORK">واجب منزلي</option>
							<option value="PROJECT">مشروع</option>
							<option value="PARTICIPATION">مشاركة</option>
							<option value="OTHER">أخرى</option>
						</select>

						<div className="flex items-center gap-2">
							<input
                type="checkbox"
                id="isOnline"
                checked={isOnline}
                onChange={(e) => setIsOnline(e.target.checked)} />

							<label htmlFor="isOnline">امتحان أونلاين</label>
						</div>

						<textarea
              className="border rounded-md px-3 py-2 text-sm md:col-span-2"
              placeholder="ملاحظات"
              aria-label="ملاحظات"
              value={notes}
              onChange={(e) => setNotes(e.target.value)} />


						<button className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">حفظ الامتحان والدرجة</button>
					</form>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<div className="rounded-lg border p-4">
						<h2 className="font-semibold mb-2">امتحاناتك مع المدرسين</h2>
						<ul className="space-y-2 text-sm">
							{Array.isArray(examResults) && examResults.map((r) =>
              <li key={r.id} className="border rounded-md p-3">
									<div className="flex items-center justify-between mb-1">
										<span>{r.exam.subject} - {r.exam.title}</span>
										<button className="text-destructive text-xs" onClick={() => deleteExamResult(r.id)}>حذف</button>
									</div>
									<div className="text-muted-foreground">
										<p>الدرجة: {r.score} / 100</p>
										<p>التاريخ: {new Date(r.takenAt).toLocaleDateString()}</p>
										{r.teacher && <p>المدرس: {r.teacher.name}</p>}
									</div>
								</li>
              )}
						</ul>
					</div>

					<div className="rounded-lg border p-4">
						<h2 className="font-semibold mb-2">درجاتك مع المدرسين</h2>
						<ul className="space-y-2 text-sm">
							{Array.isArray(userGrades) && userGrades.map((g) =>
              <li key={g.id} className="border rounded-md p-3">
									<div className="flex items-center justify-between mb-1">
										<span>{g.subject} - {g.assignmentType}</span>
										<button className="text-destructive text-xs" onClick={() => deleteGrade(g.id)}>حذف</button>
									</div>
									<div className="text-muted-foreground">
										<p>الدرجة: {g.grade} / {g.maxGrade}</p>
										<p>التاريخ: {new Date(g.date).toLocaleDateString()}</p>
										<p>النوع: {g.isOnline ? "أونلاين" : "أوفلاين"}</p>
										{g.teacher && <p>المدرس: {g.teacher.name}</p>}
										{g.notes && <p>ملاحظات: {g.notes}</p>}
									</div>
								</li>
              )}
						</ul>
					</div>
				</div>
			</section>
			</div>);

}
