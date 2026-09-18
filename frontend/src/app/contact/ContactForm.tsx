"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { supportService } from "@/services/api/support-service";
import { S } from "@/app/support/_components/support-design";

const SUBJECT_TO_CATEGORY: Record<string, string> = {
  support: "technical",
  billing: "billing",
  content: "content",
  partnership: "other",
  other: "other",
};

export function ContactForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "login" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const ticket = await supportService.createTicket({
        subject: `رسالة تواصل: ${subject || "استفسار عام"}`.slice(0, 200),
        description: message,
        categoryId: SUBJECT_TO_CATEGORY[subject] ?? "other",
        priority: "NORMAL",
      });
      setStatus("sent");
      setMessage("");
      setSubject("");
      // Keep the created ticket id reachable for follow-up.
      window.sessionStorage.setItem("last-contact-ticket", ticket.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setStatus(msg.includes("401") ? "login" : "error");
    }
  }

  if (status === "sent") {
    return (
      <div className={`${S.alertSuccess}`} role="status">
        <p className="font-black text-[#0F766E] dark:text-green-400">تم استلام رسالتك بنجاح</p>
        <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400">
          أنشأنا لك تذكرة دعم ويمكنك متابعتها من{" "}
          <Link href="/support/tickets" className="font-bold text-[#0F766E] dark:text-orange-500 underline">صفحة تذاكري</Link>.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className={`${S.btnSecondary} mt-6`}
        >
          إرسال رسالة أخرى
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className={S.label} htmlFor="contact-subject">الموضوع</label>
        <select
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={S.input}
          required
        >
          <option value="">اختر نوع الاستفسار</option>
          <option value="support">مشكلة تقنية</option>
          <option value="billing">الدفع والفواتير</option>
          <option value="content">محتوى تعليمي</option>
          <option value="partnership">شراكات</option>
          <option value="other">أخرى</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className={S.label} htmlFor="contact-message">الرسالة</label>
        <textarea
          id="contact-message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اكتب رسالتك هنا... (20 حرفاً على الأقل)"
          minLength={20}
          maxLength={20000}
          required
          className={`${S.input} resize-none`}
        />
      </div>
      {status === "login" && (
        <p className={S.alertWarn} role="alert">
          يجب <Link href="/login" className="font-bold underline">تسجيل الدخول</Link> أولاً لإرسال رسالتك كتذكرة دعم.
        </p>
      )}
      {status === "error" && (
        <p className={S.alertError} role="alert">
          تعذّر إرسال الرسالة. حاول مجدداً أو راسلنا عبر <Link href="/support/tickets/new" className="font-bold underline">مركز المساعدة</Link>.
        </p>
      )}
      <button
        type="submit"
        id="contact-submit"
        disabled={status === "sending"}
        className={`inline-flex items-center justify-center gap-2 ${S.btnPrimaryLarge}`}
      >
        <Send className="w-4 h-4" />
        {status === "sending" ? "جارٍ الإرسال..." : "إرسال الرسالة"}
      </button>
    </form>
  );
}
