"use client";

import { useEffect, useState } from "react";
import { ensureUser } from "@/lib/user-utils";

type Teacher = { id: string; name: string; subject: string; onlineUrl?: string | null };

type Lesson = { id: string; title: string; location: string; startTime: string; endTime: string; teacher: Teacher };

type Schedule = { id: string; planJson: string };

export default function TeachersPage() {
	const [userId, setUserId] = useState<string | null>(null);
	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [lessons, setLessons] = useState<Lesson[]>([]);
	const [schedule, setSchedule] = useState<Schedule | null>(null);

	const [teacherId, setTeacherId] = useState("");
	const [title, setTitle] = useState("");
	const [location, setLocation] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");

	useEffect(() => {
		ensureUser().then(setUserId);
	}, []);

	useEffect(() => {
		(async () => {
			const ts = await fetch("/api/teachers").then((r) => r.json());
			setTeachers(ts);
		})();
	}, []);

	useEffect(() => {
		if (!userId) return;
		(async () => {
			const ls = await fetch(`/api/lessons?userId=${userId}`).then((r) => r.json());
			setLessons(ls);
			const sch = await fetch(`/api/schedule?userId=${userId}`).then((r) => r.json());
			setSchedule(sch);
		})();
	}, [userId]);

	async function addLesson(e: React.FormEvent) {
		e.preventDefault();
		if (!userId || !teacherId || !title || !location || !startTime || !endTime) return;
		const res = await fetch("/api/lessons", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId, teacherId, title, location, startTime, endTime }),
		});
		const newLesson = await res.json();
		setLessons((l) => [...l, newLesson]);
		// Update schedule plan
		try {
			const plan = schedule?.planJson ? JSON.parse(schedule.planJson) : {};
			const dayKey = new Date(startTime).toLocaleDateString("en-CA");
			plan[dayKey] = plan[dayKey] || [];
			plan[dayKey].push({ type: "lesson", title, location, startTime, endTime, teacherId });
			const s = await fetch("/api/schedule", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, plan }),
			}).then((r) => r.json());
			setSchedule(s);
		} catch {}
		setTeacherId("");
		setTitle("");
		setLocation("");
		setStartTime("");
		setEndTime("");
	}

	return (
		<div className="px-4">
			<section className="mx-auto max-w-7xl py-8 space-y-6">
				<h1 className="text-2xl md:text-3xl font-bold">أفضل المدرسين والدروس الأوفلاين</h1>
				<div className="rounded-lg border p-4">
					<h2 className="font-semibold mb-2">المدرسون</h2>
					<ul className="grid md:grid-cols-2 gap-3 text-sm">
						{teachers.map((t) => (
							<li key={t.id} className="border rounded-md p-3 flex items-center justify-between">
								<span>{t.subject} - {t.name}</span>
								{t.onlineUrl ? <a className="text-primary" href={t.onlineUrl} target="_blank" rel="noreferrer">رابط</a> : null}
							</li>
						))}
					</ul>
				</div>

				<div className="rounded-lg border p-4">
					<h2 className="font-semibold mb-2">أضف درس أوفلاين</h2>
					<form className="grid md:grid-cols-2 gap-3" onSubmit={addLesson}>
						<select className="border rounded-md px-3 py-2 text-sm" aria-label="اختر المدرس" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
							<option value="">اختر المدرس</option>
							{teachers.map((t) => (
								<option key={t.id} value={t.id}>{t.subject} - {t.name}</option>
							))}
						</select>
						<input className="border rounded-md px-3 py-2 text-sm" placeholder="عنوان الدرس" aria-label="عنوان الدرس" value={title} onChange={(e) => setTitle(e.target.value)} />
						<input className="border rounded-md px-3 py-2 text-sm" placeholder="المكان" aria-label="المكان" value={location} onChange={(e) => setLocation(e.target.value)} />
						<input type="datetime-local" className="border rounded-md px-3 py-2 text-sm" aria-label="موعد البداية" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
						<input type="datetime-local" className="border rounded-md px-3 py-2 text-sm" aria-label="موعد النهاية" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
						<button className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">حفظ</button>
					</form>
				</div>

				<div className="rounded-lg border p-4">
					<h2 className="font-semibold mb-2">دروسك القادمة</h2>
					<ul className="space-y-2 text-sm">
						{lessons.map((l) => (
							<li key={l.id} className="border rounded-md p-3 flex items-center justify-between">
								<span>{l.teacher.subject} - {l.teacher.name} | {l.title} @ {l.location}</span>
								<span className="text-muted-foreground">{new Date(l.startTime).toLocaleString()}</span>
							</li>
						))}
					</ul>
				</div>
			</section>
		</div>
	);
} 