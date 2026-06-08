"use client";

import React from "react";
import { Send } from "lucide-react";

export function ContactForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground" htmlFor="contact-name">الاسم</label>
          <input
            id="contact-name"
            type="text"
            placeholder="اسمك الكريم"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground" htmlFor="contact-email">البريد الإلكتروني</label>
          <input
            id="contact-email"
            type="email"
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-muted-foreground" htmlFor="contact-subject">الموضوع</label>
        <select
          id="contact-subject"
          className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
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
        <label className="text-sm font-bold text-muted-foreground" htmlFor="contact-message">الرسالة</label>
        <textarea
          id="contact-message"
          rows={5}
          placeholder="اكتب رسالتك هنا..."
          className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors resize-none"
        />
      </div>
      <button
        type="submit"
        id="contact-submit"
        className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-black font-black rounded-2xl hover:scale-[1.02] transition-transform"
      >
        <Send className="w-4 h-4" />
        إرسال الرسالة
      </button>
    </form>
  );
}
