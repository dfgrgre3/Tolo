"use client";

import { FormEvent, useState } from "react";
import { ApiError } from "@/lib/api/api-client";
import { submitTeacherApplicationRaw } from "@/features/teaching/api/teaching-gateway";

export default function TeacherApplicationPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [subjects, setSubjects] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [bio, setBio] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage(null);
    try {
      await submitTeacherApplicationRaw({
        fullName, phone, subjects: subjects.split(",").map((v) => v.trim()).filter(Boolean),
        experienceYears: Number(experienceYears) || 0, bio,
      });
      setMessage("تم إرسال طلب التدريس للمراجعة.");
    } catch (error) { setMessage(error instanceof ApiError || error instanceof Error ? error.message : "تعذر إرسال الطلب"); }
    finally { setLoading(false); }
  };
  return <main className="mx-auto max-w-xl p-6" dir="rtl"><h1 className="mb-2 text-2xl font-bold">طلب الانضمام كمدرس</h1><p className="mb-6 text-slate-500">هذا الطلب منفصل عن التسجيل العام ويحتاج مراجعة واعتماد.</p><form onSubmit={submit} className="grid gap-4"><input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم الكامل" className="rounded border p-3" /><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="الهاتف" className="rounded border p-3" /><input required value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="المواد (افصل بينها بفواصل)" className="rounded border p-3" /><input type="number" min="0" max="80" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="سنوات الخبرة" className="rounded border p-3" /><textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="نبذة وخبراتك" className="min-h-32 rounded border p-3" /><button disabled={loading} className="rounded bg-primary p-3 font-bold text-white">{loading ? "جارٍ الإرسال..." : "إرسال الطلب"}</button>{message && <p>{message}</p>}</form></main>;
}
