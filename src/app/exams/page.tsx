"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ensureUser } from "@/lib/user-utils";
import { safeDocument } from "@/lib/safe-client-utils";

type Exam = { id: string; subject: string; title: string; year: number; url: string };

type ExamResult = { id: string; score: number; takenAt: string; exam: Exam };

export default function ExamsPage() {
	const search = useSearchParams();
	const focusId = search.get("focus");
	const [userId, setUserId] = useState<string | null>(null);
	const [exams, setExams] = useState<Exam[]>([]);
	const [results, setResults] = useState<ExamResult[]>([]);
	const [examId, setExamId] = useState("");
	const [score, setScore] = useState(0);
	const [takenAt, setTakenAt] = useState("");

	useEffect(() => {
		ensureUser().then(setUserId);
	}, []);

	useEffect(() => {
		(async () => {
			const ex = await fetch("/api/exams").then((r) => r.json());
			setExams(ex);
		})();
	}, []);

	useEffect(() => {
		if (!userId) return;
		fetch(`/api/exams/results?userId=${userId}`).then((r) => r.json()).then((list) => {
			setResults(list);
			if (focusId) {
				setTimeout(() => {
					const el = safeDocument(
						(doc) => doc.getElementById(`exam-${focusId}`) || doc.getElementById(`exam-option-${focusId}`),
						null
					);
					if (el) {
						el.scrollIntoView({ behavior: "smooth", block: "center" });
						el.classList.add("ring", "ring-primary");
						setTimeout(() => el.classList.remove("ring", "ring-primary"), 2000);
					}
				}, 300);
			}
		});
	}, [userId, focusId]);

	async function addResult(e: React.FormEvent) {
		e.preventDefault();
		if (!userId || !examId) return;
		const res = await fetch("/api/exams/results", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId, examId, score: Number(score), takenAt: takenAt || undefined }),
		});
		const data = await res.json();
		setResults((r) => [data, ...r]);
		setExamId("");
		setScore(0);
		setTakenAt("");
	}

	async function deleteResult(id: string) {
		await fetch(`/api/exams/results/${id}`, { method: "DELETE" });
		setResults((r) => r.filter((x) => x.id !== id));
	}

	return (
		<div className="px-4">
			<section className="mx-auto max-w-7xl py-8 space-y-6">
				<h1 className="text-2xl md:text-3xl font-bold">الامتحانات التجريبية</h1>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="rounded-lg border p-4">
						<h2 className="font-semibold mb-2">نماذج سابقة</h2>
						<ul className="text-sm list-disc pr-5 text-primary">
							{exams.map((p) => (
								<li key={p.id} id={`exam-option-${p.id}`}>
									<a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">{p.subject}: {p.title} ({p.year})</a>
								</li>
							))}
						</ul>
					</div>
					<div className="rounded-lg border p-4">
						<h2 className="font-semibold mb-2">تسجيل الدرجات</h2>
						<form className="grid gap-3" onSubmit={addResult}>
							<select className="border rounded-md px-3 py-2 text-sm" aria-label="اختر الامتحان" value={examId} onChange={(e) => setExamId(e.target.value)}>
								<option value="">اختر الامتحان</option>
								{exams.map((e) => (
									<option key={e.id} value={e.id}>{e.subject} - {e.title} ({e.year})</option>
								))}
							</select>
							<input type="number" min={0} max={100} className="border rounded-md px-3 py-2 text-sm" placeholder="الدرجة" aria-label="الدرجة" value={score} onChange={(e) => setScore(Number(e.target.value))} />
							<input type="date" className="border rounded-md px-3 py-2 text-sm" aria-label="تاريخ الاختبار" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
							<button className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">حفظ النتيجة</button>
						</form>
					</div>
				</div>

				<div className="rounded-lg border p-4">
					<h2 className="font-semibold mb-2">نتائجك</h2>
					<ul className="space-y-2 text-sm">
						{Array.isArray(results) && results.map((r) => (
							<li id={`exam-${r.exam.id}`} key={r.id} className="border rounded-md p-3 flex items-center justify-between">
								<span>{r.exam.subject} - {r.exam.title}</span>
								<span className="flex items-center gap-3">
									<span className="text-muted-foreground">{r.score} / 100</span>
									<button className="text-destructive text-xs" onClick={() => deleteResult(r.id)}>حذف</button>
								</span>
							</li>
						))}
					</ul>
				</div>
			</section>
		</div>
	);
} 