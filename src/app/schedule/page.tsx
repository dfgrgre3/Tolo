"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const LOCAL_USER_KEY = "tw_user_id";
async function ensureUser(): Promise<string> {
	let id = localStorage.getItem(LOCAL_USER_KEY);
	if (!id) {
		const res = await fetch("/api/users/guest", { method: "POST" });
		const data = await res.json();
		id = data.id;
		localStorage.setItem(LOCAL_USER_KEY, id!);
	}
	return id!;
}

type PlanBlock = { id: string; type: string; title: string; color?: string; location?: string; startTime?: string; endTime?: string; teacherId?: string; taskId?: string; examId?: string };

type Plan = Record<string, PlanBlock[]>;

type Schedule = { id: string; planJson: string };

type Task = { id: string; title: string };

type Exam = { id: string; title: string; subject: string; year: number };

const daysOrder = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;

function dayKeyFromDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

const typeOptions = [
	{ value: "study", label: "مذاكرة", color: "#60a5fa" },
	{ value: "review", label: "مراجعة", color: "#34d399" },
	{ value: "task", label: "مهمة", color: "#f59e0b" },
	{ value: "exam", label: "امتحان", color: "#ef4444" },
	{ value: "lesson", label: "درس", color: "#a78bfa" },
];

export default function SchedulePage() {
	const router = useRouter();
	const [userId, setUserId] = useState<string | null>(null);
	const [schedule, setSchedule] = useState<Schedule | null>(null);
	const [plan, setPlan] = useState<Plan>({});
	const [jsonOpen, setJsonOpen] = useState(false);
	const [jsonText, setJsonText] = useState("{}");
	const [error, setError] = useState("");

	const [activeDay, setActiveDay] = useState<string | null>(null);
	const [newTitle, setNewTitle] = useState("");
	const [newType, setNewType] = useState("study");
	const [newColor, setNewColor] = useState("#60a5fa");
	const [tasks, setTasks] = useState<Task[]>([]);
	const [exams, setExams] = useState<Exam[]>([]);
	const [selectedTaskId, setSelectedTaskId] = useState("");
	const [selectedExamId, setSelectedExamId] = useState("");

	const weekDates = useMemo(() => {
		const now = new Date();
		const day = now.getDay();
		const diffToSat = (day + 1) % 7;
		const sat = new Date(now);
		sat.setDate(now.getDate() - diffToSat);
		const arr: { label: string; key: string }[] = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(sat);
			d.setDate(sat.getDate() + i);
			arr.push({ label: daysOrder[i], key: dayKeyFromDate(d) });
		}
		return arr;
	}, []);

	useEffect(() => {
		ensureUser().then(setUserId);
	}, []);

	useEffect(() => {
		if (!userId) return;
		(async () => {
			const sch: Schedule = await fetch(`/api/schedule?userId=${userId}`).then((r) => r.json());
			setSchedule(sch);
			try {
				const parsed: Plan = JSON.parse(sch?.planJson || "{}");
				setPlan(parsed);
				setJsonText(JSON.stringify(parsed, null, 2));
			} catch {
				setPlan({});
			}
			const ts: Task[] = await fetch(`/api/tasks?userId=${userId}`).then((r) => r.json());
			setTasks(ts);
			const ex: Exam[] = await fetch(`/api/exams`).then((r) => r.json());
			setExams(ex);
		})();
	}, [userId]);

	async function persist(next: Plan) {
		if (!userId) return;
		setPlan(next);
		setJsonText(JSON.stringify(next, null, 2));
		await fetch("/api/schedule", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId, plan: next }),
		});
	}

	function onDragStart(e: React.DragEvent, payload: { fromKey: string; blockId: string }) {
		e.dataTransfer.setData("application/json", JSON.stringify(payload));
	}

	function onDrop(e: React.DragEvent, toKey: string) {
		const raw = e.dataTransfer.getData("application/json");
		if (!raw) return;
		const { fromKey, blockId } = JSON.parse(raw) as { fromKey: string; blockId: string };
		if (!fromKey || !blockId) return;
		const src = [...(plan[fromKey] || [])];
		const idx = src.findIndex((b) => b.id === blockId);
		if (idx === -1) return;
		const [moved] = src.splice(idx, 1);
		const dst = [...(plan[toKey] || [])];
		dst.push(moved);
		persist({ ...plan, [fromKey]: src, [toKey]: dst });
	}

	function addBlock(dayKey: string) {
		setActiveDay(dayKey);
	}

	function createBlock() {
		if (!activeDay || !newTitle.trim()) return;
		const id = crypto.randomUUID();
		const extra: Partial<PlanBlock> = {};
		if (newType === "task" && selectedTaskId) extra.taskId = selectedTaskId;
		if (newType === "exam" && selectedExamId) extra.examId = selectedExamId;
		const next = {
			...plan,
			[activeDay]: [ ...(plan[activeDay] || []), { id, type: newType, title: newTitle, color: newColor, ...extra } ],
		};
		persist(next);
		setActiveDay(null);
		setNewTitle("");
		setNewType("study");
		setNewColor("#60a5fa");
		setSelectedTaskId("");
		setSelectedExamId("");
	}

	function removeBlock(dayKey: string, blockId: string) {
		const next = { ...plan, [dayKey]: (plan[dayKey] || []).filter((b) => b.id !== blockId) };
		persist(next);
	}

	function openLinked(b: PlanBlock) {
		if (b.taskId) {
			router.push(`/tasks?focus=${b.taskId}`);
			return;
		}
		if (b.examId) {
			router.push(`/exams?focus=${b.examId}`);
			return;
		}
	}

	async function saveJson() {
		try {
			const parsed: Plan = JSON.parse(jsonText || "{}");
			setError("");
			await persist(parsed);
			setJsonOpen(false);
		} catch {
			setError("صيغة JSON غير صحيحة");
		}
	}

	return (
		<div className="px-4">
			<section className="mx-auto max-w-7xl py-8 space-y-6">
				<h1 className="text-2xl md:text-3xl font-bold">الجدول الأسبوعي</h1>
				<div className="flex items-center gap-2">
					<button className="px-3 py-2 rounded-md border text-sm" onClick={() => setJsonOpen((v) => !v)} aria-label="تحرير JSON">{jsonOpen ? "إخفاء JSON" : "تحرير JSON"}</button>
				</div>

				{jsonOpen ? (
					<div className="rounded-lg border p-4 space-y-3">
						<p className="text-sm text-muted-foreground">حرر الخطة كـ JSON.</p>
						<textarea aria-label="خطة الأسبوع JSON" className="w-full h-72 border rounded-md px-3 py-2 text-sm font-mono" value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
						{error ? <p className="text-sm text-destructive">{error}</p> : null}
						<button className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm" onClick={saveJson}>حفظ</button>
					</div>
				) : null}

				<div className="grid md:grid-cols-7 gap-3">
					{weekDates.map((d) => (
						<div key={d.key} className="rounded-lg border p-3 min-h-64"
							onDragOver={(e) => e.preventDefault()}
							onDrop={(e) => onDrop(e, d.key)}
						>
							<div className="flex items-center justify-between mb-2">
								<p className="font-semibold text-sm">{d.label}</p>
								<button className="text-xs px-2 py-1 rounded-md border" onClick={() => addBlock(d.key)} aria-label="إضافة بلوك">+ إضافة</button>
							</div>
							<ul className="space-y-2">
								{(plan[d.key] || []).map((b) => (
									<li key={b.id}
										draggable
										onDragStart={(e) => onDragStart(e, { fromKey: d.key, blockId: b.id })}
										onClick={() => openLinked(b)}
										className="border rounded-md p-2 text-xs flex items-center justify-between cursor-pointer"
										style={{ backgroundColor: b.color || "#f3f4f6" }}
									>
										<span>
											{b.title}
											{b.taskId ? <em className="ml-2 text-muted-foreground">(مهمة)</em> : null}
											{b.examId ? <em className="ml-2 text-muted-foreground">(امتحان)</em> : null}
										</span>
										<button className="text-destructive text-xs" onClick={(e) => { e.stopPropagation(); removeBlock(d.key, b.id); }} aria-label="حذف">حذف</button>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				{activeDay ? (
					<div className="fixed inset-0 bg-black/40 flex items-center justify-center">
						<div className="bg-background rounded-lg border p-4 w-full max-w-md space-y-3">
							<h3 className="font-semibold">إضافة بلوك</h3>
							<input className="border rounded-md px-3 py-2 text-sm w-full" placeholder="العنوان" aria-label="العنوان" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
							<select className="border rounded-md px-3 py-2 text-sm w-full" aria-label="النوع" value={newType} onChange={(e) => {
								setNewType(e.target.value);
								const opt = typeOptions.find((o) => o.value === e.target.value);
								if (opt) setNewColor(opt.color);
							}}>
								{typeOptions.map((o) => (
									<option key={o.value} value={o.value}>{o.label}</option>
								))}
							</select>
							{newType === "task" ? (
								<select className="border rounded-md px-3 py-2 text-sm w-full" aria-label="اختر مهمة" value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
									<option value="">اختر مهمة</option>
									{tasks.map((t) => (
										<option key={t.id} value={t.id}>{t.title}</option>
									))}
								</select>
							) : null}
							{newType === "exam" ? (
								<select className="border rounded-md px-3 py-2 text-sm w-full" aria-label="اختر امتحان" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
									<option value="">اختر امتحان</option>
									{exams.map((ex) => (
										<option key={ex.id} value={ex.id}>{ex.subject} - {ex.title} ({ex.year})</option>
									))}
								</select>
							) : null}
							<div className="flex items-center gap-2">
								<label className="text-sm">اللون</label>
								<input type="color" className="border rounded-md w-10 h-8" aria-label="اللون" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
							</div>
							<div className="flex items-center justify-end gap-2">
								<button className="px-3 py-2 rounded-md border text-sm" onClick={() => setActiveDay(null)}>إلغاء</button>
								<button className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm" onClick={createBlock}>إضافة</button>
							</div>
						</div>
					</div>
				) : null}
			</section>
		</div>
	);
} 