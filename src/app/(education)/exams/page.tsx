"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/app/(auth)/components/AuthGuard";
import { ensureUser } from "@/lib/user-utils";
import { safeDocument, safeFetch } from "@/lib/safe-client-utils";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, Trash2, BookOpen, Award, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Exam { 
  id: string; 
  subject: string; 
  title: string; 
  year: number; 
  url: string;
  type?: string;
}

interface ExamResult { 
  id: string; 
  score: number; 
  takenAt: string; 
  exam: Exam;
}

export default function ExamsPage() {
	const search = useSearchParams();
	const focusId = search.get("focus");
	const [userId, setUserId] = useState<string | null>(null);
	const [exams, setExams] = useState<Exam[]>([]);
	const [results, setResults] = useState<ExamResult[]>([]);
	const [examId, setExamId] = useState("");
	const [score, setScore] = useState("");
	const [takenAt, setTakenAt] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);

	useEffect(() => {
		ensureUser().then(setUserId);
	}, []);

	// جلب الامتحانات
	useEffect(() => {
		const fetchExams = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const { data, error: fetchError } = await safeFetch<Exam[]>(
					"/api/exams",
					undefined,
					[]
				);
				if (fetchError) {
					logger.error('Error fetching exams:', fetchError);
					setError("فشل تحميل الامتحانات");
				} else {
					setExams(data || []);
				}
			} catch (err) {
				logger.error('Error fetching exams:', err);
				setError("حدث خطأ أثناء تحميل الامتحانات");
			} finally {
				setIsLoading(false);
			}
		};
		fetchExams();
	}, []);

	// جلب النتائج
	useEffect(() => {
		if (!userId) return;
		
		const fetchResults = async () => {
			try {
				const { data, error: fetchError } = await safeFetch<ExamResult[]>(
					`/api/exams/results?userId=${userId}`,
					undefined,
					[]
				);
				if (fetchError) {
					logger.error('Error fetching results:', fetchError);
				} else {
					setResults(data || []);
					if (focusId && data) {
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
				}
			} catch (err) {
				logger.error('Error fetching results:', err);
			}
		};
		fetchResults();
	}, [userId, focusId]);

	const addResult = useCallback(async (e: React.FormEvent) => {
		e.preventDefault();
		if (!userId || !examId) {
			setSubmitError("الرجاء اختيار الامتحان");
			return;
		}

		const scoreNum = parseFloat(score);
		if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
			setSubmitError("الرجاء إدخال درجة صحيحة بين 0 و 100");
			return;
		}

		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const { data, error: submitError } = await safeFetch<ExamResult>(
				"/api/exams/results",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ 
						userId, 
						examId, 
						score: scoreNum, 
						takenAt: takenAt || undefined 
					}),
				},
				null
			);

			if (submitError || !data) {
				setSubmitError(submitError?.message || "فشل حفظ النتيجة");
				logger.error('Error adding result:', submitError);
			} else {
				setResults((r) => [data, ...r]);
				setExamId("");
				setScore("");
				setTakenAt("");
				setSubmitError(null);
			}
		} catch (err) {
			logger.error('Error adding result:', err);
			setSubmitError("حدث خطأ غير متوقع");
		} finally {
			setIsSubmitting(false);
		}
	}, [userId, examId, score, takenAt]);

	const deleteResult = useCallback(async (id: string) => {
		if (!confirm('هل أنت متأكد من حذف هذه النتيجة؟')) return;

		try {
			const { error: deleteError } = await safeFetch(
				`/api/exams/results/${id}`,
				{ method: "DELETE" },
				null
			);

			if (deleteError) {
				logger.error('Error deleting result:', deleteError);
				setError("فشل حذف النتيجة");
			} else {
				setResults((r) => r.filter((x) => x.id !== id));
			}
		} catch (err) {
			logger.error('Error deleting result:', err);
			setError("حدث خطأ أثناء حذف النتيجة");
		}
	}, []);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('ar-EG', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	return (
		<AuthGuard>
			<div className="px-4">
				<section className="mx-auto max-w-7xl py-8 space-y-6">
					<h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">الامتحانات التجريبية</h1>
					
					{error && (
						<Alert variant="destructive" role="alert">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{isLoading ? (
						<div className="flex justify-center items-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-primary" />
						</div>
					) : (
						<div className="grid gap-6 md:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<BookOpen className="h-5 w-5" />
										نماذج سابقة
									</CardTitle>
									<CardDescription>امتحانات سابقة للتدريب</CardDescription>
								</CardHeader>
								<CardContent>
									{exams.length === 0 ? (
										<p className="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد امتحانات متاحة</p>
									) : (
										<ul className="space-y-2 text-sm">
											{exams.map((exam) => (
												<li key={exam.id} id={`exam-option-${exam.id}`} className="border rounded-md p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
													<a 
														href={exam.url} 
														target="_blank" 
														rel="noreferrer" 
														className="text-primary hover:underline flex items-center gap-2"
													>
														<span>{exam.subject}: {exam.title} ({exam.year})</span>
													</a>
												</li>
											))}
										</ul>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Award className="h-5 w-5" />
										تسجيل الدرجات
									</CardTitle>
									<CardDescription>سجل نتائج امتحاناتك</CardDescription>
								</CardHeader>
								<CardContent>
									<form className="space-y-4" onSubmit={addResult}>
										<div>
											<Label htmlFor="exam-select">الامتحان</Label>
											<Select value={examId} onValueChange={setExamId} required>
												<SelectTrigger id="exam-select" aria-label="اختر الامتحان">
													<SelectValue placeholder="اختر الامتحان" />
												</SelectTrigger>
												<SelectContent>
													{exams.map((exam) => (
														<SelectItem key={exam.id} value={exam.id}>
															{exam.subject} - {exam.title} ({exam.year})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div>
											<Label htmlFor="score-input">الدرجة (0-100)</Label>
											<Input
												id="score-input"
												type="number"
												min={0}
												max={100}
												placeholder="الدرجة"
												value={score}
												onChange={(e) => setScore(e.target.value)}
												required
											/>
										</div>
										<div>
											<Label htmlFor="date-input">تاريخ الاختبار</Label>
											<Input
												id="date-input"
												type="date"
												value={takenAt}
												onChange={(e) => setTakenAt(e.target.value)}
											/>
										</div>
										{submitError && (
											<Alert variant="destructive" role="alert">
												<AlertCircle className="h-4 w-4" />
												<AlertDescription>{submitError}</AlertDescription>
											</Alert>
										)}
										<Button type="submit" disabled={isSubmitting} className="w-full">
											{isSubmitting ? (
												<>
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													جاري الحفظ...
												</>
											) : (
												"حفظ النتيجة"
											)}
										</Button>
									</form>
								</CardContent>
							</Card>
						</div>
					)}

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Award className="h-5 w-5" />
								نتائجك
							</CardTitle>
							<CardDescription>جميع نتائج الامتحانات المسجلة</CardDescription>
						</CardHeader>
						<CardContent>
							{results.length === 0 ? (
								<p className="text-gray-500 dark:text-gray-400 text-center py-8">لا توجد نتائج مسجلة</p>
							) : (
								<div className="space-y-3">
									{results.map((result) => (
										<div
											id={`exam-${result.exam.id}`}
											key={result.id}
											className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
										>
											<div className="flex-1">
												<div className="font-medium text-gray-900 dark:text-gray-100">
													{result.exam.subject} - {result.exam.title}
												</div>
												<div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
													<span className="flex items-center gap-1">
														<Award className="h-4 w-4" />
														{result.score} / 100
													</span>
													<span className="flex items-center gap-1">
														<Calendar className="h-4 w-4" />
														{formatDate(result.takenAt)}
													</span>
												</div>
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => deleteResult(result.id)}
												className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
												aria-label={`حذف نتيجة ${result.exam.title}`}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</section>
			</div>
		</AuthGuard>
	);
} 