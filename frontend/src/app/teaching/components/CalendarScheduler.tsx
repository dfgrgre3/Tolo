"use client";

import React, { useState } from "react";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CalendarEvent } from "../hooks/use-teaching-data";

interface CalendarSchedulerProps {
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, "id">) => void;
}

export default function CalendarScheduler({ events, onAddEvent }: CalendarSchedulerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]!);
  const [time, setTime] = useState("10:00");
  const [type, setType] = useState<CalendarEvent["type"]>("class");
  const [duration, setDuration] = useState("ساعة واحدة");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddEvent({
      title,
      date,
      time,
      type,
      duration,
    });
    setTitle("");
    setShowAddForm(false);
  };

  const getEventBadge = (eventType: CalendarEvent["type"]) => {
    switch (eventType) {
      case "class":
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20";
      case "meeting":
        return "bg-blue-50 text-blue-600 dark:bg-blue-950/20";
      case "deadline":
        return "bg-red-50 text-red-600 dark:bg-red-950/20";
      default:
        return "bg-amber-50 text-amber-600 dark:bg-amber-950/20";
    }
  };

  const getEventLabel = (eventType: CalendarEvent["type"]) => {
    switch (eventType) {
      case "class":
        return "محاضرة حية";
      case "meeting":
        return "اجتماع";
      case "deadline":
        return "موعد واجب";
      default:
        return "تنبيه هام";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-right" dir="rtl">
      {/* Event list */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans">التقويم والجدول الدراسي</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">جدول مواعيد الحصص المباشرة والواجبات المطلوبة</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-primary hover:bg-primary/95 text-white flex items-center gap-1.5 rounded-xl">
            <Plus className="w-4 h-4" />
            إضافة موعد
          </Button>
        </div>

        {/* Add Event Form Modal-like block */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-card space-y-4 text-xs font-semibold">
            <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100">تفاصيل الحدث الجديد</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-500">اسم الفعالية / العنوان</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: بث مباشر للإجابة على الأسئلة" className="rounded-xl border-slate-200 dark:border-slate-800 text-right" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500">نوع الحدث</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CalendarEvent["type"])}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-slate-700 dark:text-slate-200 p-2 text-right text-xs focus:outline-none"
                >
                  <option value="class">محاضرة حية / بث مباشر</option>
                  <option value="deadline">تسليم واجب / امتحان</option>
                  <option value="meeting">اجتماع مع إدارة</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-500">تاريخ البدء</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border-slate-200 dark:border-slate-800 text-right" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500">التوقيت والمدة</label>
                <div className="flex gap-2">
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl border-slate-200 dark:border-slate-800 text-right" />
                  <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="ساعة ونصف" className="rounded-xl border-slate-200 dark:border-slate-800 text-right" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="submit" className="bg-primary text-white rounded-xl">حفظ الحدث</Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="rounded-xl">إلغاء</Button>
            </div>
          </form>
        )}

        {/* List of upcoming events */}
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-850 rounded-2xl text-slate-400 text-xs">لا يوجد فعاليات قادمة مضافة</div>
          ) : (
            events.map((evt) => (
              <Card key={evt.id} className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-card">
                <CardContent className="p-5 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-4">
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${getEventBadge(evt.type)}`}>
                      {getEventLabel(evt.type)}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100">{evt.title}</h4>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{evt.time} ({evt.duration || "طوال اليوم"})</span>
                        </span>
                        <span>•</span>
                        <span>{evt.date}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Calendar Month sidebar preview widget */}
      <div className="space-y-6">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-850 dark:text-slate-150">تاريخ الأيام النشطة</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-center">
            {/* Displaying simple month overview dates grid */}
            <div className="grid grid-cols-7 gap-2 text-[10px] text-slate-400 font-bold mb-2">
              <span>ح</span><span>ن</span><span>ث</span><span>ر</span><span>خ</span><span>ج</span><span>س</span>
            </div>
            <div className="grid grid-cols-7 gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              {Array.from({ length: 30 }).map((_, idx) => {
                const dayNum = idx + 1;
                const dayStr = dayNum.toString().padStart(2, "0");
                const hasEvent = events.some((evt) => evt.date?.endsWith(`-${dayStr}`));
                return (
                  <span
                    key={idx}
                    className={`py-2 rounded-xl flex items-center justify-center transition-colors ${
                      hasEvent
                        ? "bg-primary/20 text-primary border border-primary/40 font-black"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {dayNum}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
