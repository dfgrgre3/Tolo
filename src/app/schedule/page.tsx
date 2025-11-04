"use client";

import { useEffect, useMemo, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { WebSocketProvider, useWebSocket } from "@/contexts/websocket-context";
import { safeGetItem, safeSetItem } from "@/lib/safe-client-utils";

type DragItem = {
  id: string;
  originalDay: string;
  index: number;
};

const LOCAL_USER_KEY = "tw_user_id";

type PlanBlock = { id: string; type: string; title: string; color?: string; location?: string; startTime: string; endTime: string; teacherId?: string; taskId?: string; examId?: string };

type Plan = Record<string, PlanBlock[]>;

type Schedule = { id: string; planJson: string; version: number };

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

function validateTimeFormat(time: string): boolean {
	return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

function hasTimeConflict(blocks: PlanBlock[]): boolean {
	for (let i = 0; i < blocks.length; i++) {
		for (let j = i + 1; j < blocks.length; j++) {
			const start1 = blocks[i].startTime;
			const end1 = blocks[i].endTime;
			const start2 = blocks[j].startTime;
			const end2 = blocks[j].endTime;
			
			if ((start1 >= start2 && start1 < end2) || 
				(end1 > start2 && end1 <= end2) ||
				(start2 >= start1 && start2 < end1)) {
				return true;
			}
		}
	}
	return false;
}

const DraggableBlock = memo(({ 
	block, 
	dayKey, 
	index,
	onRemove,
	onOpenLinked
}: { 
	block: PlanBlock; 
	dayKey: string; 
	index: number;
	onRemove: (dayKey: string, blockId: string) => void;
	onOpenLinked: (block: PlanBlock) => void;
}) => {
	const [{ isDragging }, drag] = useDrag(() => ({
		type: 'BLOCK',
		item: { id: block.id, originalDay: dayKey, index },
		collect: (monitor: any) => ({
			isDragging: !!monitor.isDragging(),
		}),
	}));

	return (
		<li
			ref={drag}
			className={`border rounded-md p-2 text-xs flex items-center justify-between cursor-move transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
			style={{ backgroundColor: block.color || '#f3f4f6' }}
			onClick={() => onOpenLinked(block)}
		>
			<span>
				{block.title}
				{block.startTime && block.endTime ? ` (${block.startTime} - ${block.endTime})` : ''}
				{block.taskId ? <em className="ml-2 text-muted-foreground">(مهمة)</em> : null}
				{block.examId ? <em className="ml-2 text-muted-foreground">(امتحان)</em> : null}
			</span>
			<button 
				className="text-destructive text-xs" 
				onClick={(e) => { e.stopPropagation(); onRemove(dayKey, block.id); }}
				aria-label="حذف"
			>
				حذف
			</button>
		</li>
	);
});

DraggableBlock.displayName = 'DraggableBlock';

export default function SchedulePage() {
	const router = useRouter();
	const { socket } = useWebSocket();
	const [userId, setUserId] = useState<string | null>(null);
	const [schedule, setSchedule] = useState<Schedule | null>(null);
	const [plan, setPlan] = useState<Plan>({});
	const [jsonOpen, setJsonOpen] = useState(false);
	const [jsonText, setJsonText] = useState("{}");
	const [error, setError] = useState("");
	const [loadingUser, setLoadingUser] = useState(false);
	const [loadingSchedule, setLoadingSchedule] = useState(false);
	const [loadingTasks, setLoadingTasks] = useState(false);
	const [loadingExams, setLoadingExams] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(false);

	const [activeDay, setActiveDay] = useState<string | null>(null);
	const [newTitle, setNewTitle] = useState("");
	const [newType, setNewType] = useState("study");
	const [newColor, setNewColor] = useState("#60a5fa");
	const [newStartTime, setNewStartTime] = useState("");
	const [newEndTime, setNewEndTime] = useState("");
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
		const loadUser = async () => {
			setLoadingUser(true);
			try {
				let id = safeGetItem(LOCAL_USER_KEY, { fallback: null });
				if (!id) {
					const res = await fetch("/api/users/guest", { method: "POST" });
					const data = await res.json();
					id = data.id;
					safeSetItem(LOCAL_USER_KEY, id!);
				}
				setUserId(id!);
			} catch (error) {
				console.error("Failed to load user:", error);
			} finally {
				setLoadingUser(false);
			}
		};
		
		loadUser();
	}, []);

	useEffect(() => {
		if (!userId) return;
		(async () => {
			try {
				setLoadingSchedule(true);
				const sch: Schedule = await fetch(`/api/schedule?userId=${userId}`).then((r) => r.json());
				setSchedule(sch);
				try {
					const parsed: Plan = JSON.parse(sch?.planJson || "{}");
					setPlan(parsed);
					setJsonText(JSON.stringify(parsed, null, 2));
				} catch {
					setPlan({});
				}
			} finally {
				setLoadingSchedule(false);
			}
			
			try {
				setLoadingTasks(true);
				const ts: Task[] = await fetch(`/api/tasks?userId=${userId}`).then((r) => r.json());
				setTasks(ts);
			} finally {
				setLoadingTasks(false);
			}
			
			try {
				setLoadingExams(true);
				const ex: Exam[] = await fetch(`/api/exams`).then((r) => r.json());
				setExams(ex);
			} finally {
				setLoadingExams(false);
			}
		})();
	}, [userId]);

	useEffect(() => {
		if (!socket) return;

		socket.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.type === 'SCHEDULE_UPDATE') {
				const parsed: Plan = JSON.parse(data.payload.planJson || "{}");
				setPlan(parsed);
				setJsonText(JSON.stringify(parsed, null, 2));
			}
		};

		return () => {
			socket.onmessage = null;
		};
	}, [socket]);

	async function persist(next: Plan) {
		if (!userId) return;
		setSaving(true);
		try {
			const res = await fetch("/api/schedule", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ 
					userId, 
					plan: next,
					version: schedule?.version
				}),
			});

			if (res.status === 409) {
				// Conflict detected
				const latest = await res.json();
				setError("تم تعديل الجدول من جهة أخرى. جاري تحميل أحدث نسخة...");
				setPlan(JSON.parse(latest.planJson));
				setJsonText(JSON.stringify(latest.planJson, null, 2));
				setSchedule(latest);
				return;
			}

			const updated = await res.json();
			setSchedule(updated);
			setPlan(next);
			setJsonText(JSON.stringify(next, null, 2));
		} catch (error) {
			setError("حدث خطأ أثناء الحفظ");
		} finally {
			setSaving(false);
		}
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
		if (!activeDay || !newTitle.trim() || !newStartTime || !newEndTime) return;
		if (!validateTimeFormat(newStartTime) || !validateTimeFormat(newEndTime)) return;
		const id = crypto.randomUUID();
		const extra: Partial<PlanBlock> = {};
		if (newType === "task" && selectedTaskId) extra.taskId = selectedTaskId;
		if (newType === "exam" && selectedExamId) extra.examId = selectedExamId;
		const next = {
			...plan,
			[activeDay]: [ ...(plan[activeDay] || []), { id, type: newType, title: newTitle, color: newColor, startTime: newStartTime, endTime: newEndTime, ...extra } ],
		};
		if (hasTimeConflict(next[activeDay])) {
			setError("توجد تعارضات في الأوقات");
			return;
		}
		persist(next);
		setActiveDay(null);
		setNewTitle("");
		setNewType("study");
		setNewColor("#60a5fa");
		setSelectedTaskId("");
		setSelectedExamId("");
		setNewStartTime("");
		setNewEndTime("");
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
			
			// التحقق من صيغة الوقت لكل بلوك
			for (const day in parsed) {
				for (const block of parsed[day]) {
					if (!validateTimeFormat(block.startTime) || !validateTimeFormat(block.endTime)) {
						setError("صيغة الوقت غير صحيحة، يجب أن تكون بالشكل HH:MM");
						return;
					}
					if (block.startTime >= block.endTime) {
						setError("وقت البدء يجب أن يكون قبل وقت الانتهاء");
						return;
					}
				}
				
				// التحقق من تعارض الأوقات
				if (hasTimeConflict(parsed[day])) {
					setError(`هناك تعارض في الأوقات ليوم ${day}`);
					return;
				}
			}
			
			setError("");
			await persist(parsed);
			setJsonOpen(false);
		} catch {
			setError("صيغة JSON غير صحيحة");
		}
	}

	return (
		<>
			{userId && (
				<WebSocketProvider userId={userId}>
					<DndProvider backend={HTML5Backend}>
						<div className="px-4">
							{(loadingUser || loadingSchedule || loadingTasks || loadingExams || saving) && (
								<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
									<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
								</div>
							)}
							{saving && (
								<div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm flex items-center gap-2 z-50">
									<div className="animate-spin h-4 w-4">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
											<path fillRule="evenodd" d="M12 4.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z" clipRule="evenodd" />
										</svg>
									</div>
									جاري الحفظ...
								</div>
							)}
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
												{(plan[d.key] || []).map((b, i) => (
													<DraggableBlock 
														key={b.id} 
														block={b} 
														dayKey={d.key} 
														index={i}
														onRemove={removeBlock}
														onOpenLinked={openLinked}
													/>
												))}
											</ul>
										</div>
									))}
								</div>

								{activeDay && (
									<Modal 
										isOpen={!!activeDay} 
										onClose={() => setActiveDay(null)}
										title="إضافة بلوك"
									>
										<div className="space-y-3">
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
											<input type="time" className="border rounded-md px-3 py-2 text-sm w-full" aria-label="وقت البدء" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
											<input type="time" className="border rounded-md px-3 py-2 text-sm w-full" aria-label="وقت الانتهاء" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} />
											{newType === "task" && (
												<select className="border rounded-md px-3 py-2 text-sm w-full" aria-label="اختر مهمة" value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
													<option value="">اختر مهمة</option>
													{tasks.map((t) => (
														<option key={t.id} value={t.id}>{t.title}</option>
													))}
												</select>
											)}
											{newType === "exam" && (
												<select className="border rounded-md px-3 py-2 text-sm w-full" aria-label="اختر امتحان" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
													<option value="">اختر امتحان</option>
													{exams.map((ex) => (
														<option key={ex.id} value={ex.id}>{ex.subject} - {ex.title} ({ex.year})</option>
													))}
												</select>
											)}
											<div className="flex items-center gap-2">
												<label className="text-sm">اللون</label>
												<input type="color" className="border rounded-md w-10 h-8" aria-label="اللون" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
											</div>
											<div className="flex items-center justify-end gap-2">
												<button className="px-3 py-2 rounded-md border text-sm" onClick={() => setActiveDay(null)}>إلغاء</button>
												<button className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm" onClick={createBlock}>إضافة</button>
											</div>
										</div>
									</Modal>
								)}
							</section>
						</div>
					</DndProvider>
				</WebSocketProvider>
			)}
		</>
	);
}