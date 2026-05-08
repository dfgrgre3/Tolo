"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Lesson, LessonQuestion, TabKey } from "../types";
import { bytesToMegaBytes } from "../utils";

interface LessonTabsSectionProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  activeLesson: Lesson;
  questions: LessonQuestion[];
  newQuestion: string;
  setNewQuestion: (q: string) => void;
  postingQuestion: boolean;
  postQuestion: () => Promise<void>;
  noteContent: string;
  setNoteContent: (c: string | ((prev: string) => string)) => void;
  savingNote: boolean;
  saveNote: () => Promise<void>;
  addTimestampToNotes: () => void;
  aiMessages: { role: "assistant" | "user"; content: string }[];
  aiInput: string;
  setAiInput: (i: string) => void;
  aiLoading: boolean;
  sendAiMessage: (message?: string) => Promise<void>;
}

export function LessonTabsSection({
  activeTab,
  setActiveTab,
  activeLesson,
  questions,
  newQuestion,
  setNewQuestion,
  postingQuestion,
  postQuestion,
  noteContent,
  setNoteContent,
  savingNote,
  saveNote,
  addTimestampToNotes,
  aiMessages,
  aiInput,
  setAiInput,
  aiLoading,
  sendAiMessage,
}: LessonTabsSectionProps) {
  const tabs = [
    { key: "content", label: "المحتوى", icon: BookOpen },
    { key: "resources", label: "المرفقات", icon: Download },
    { key: "qna", label: "المناقشات", icon: MessageSquare },
    { key: "notes", label: "ملاحظاتي", icon: FileText },
    { key: "ai", label: "المساعد الذكي", icon: Bot },
  ];

  const aiPromptSuggestions = [
    "لخّص هذا الدرس في نقاط سريعة",
    "ما أهم الأفكار التي يجب مراجعتها قبل الامتحان؟",
    "حوّل هذا الدرس إلى أسئلة تدريبية قصيرة",
  ];

  return (
    <section className="rounded-[32px] border border-slate-200/80 bg-white/90 p-5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
              activeTab === tab.key
                ? "bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "content" && (
            activeLesson.content ? (
              <div
                className="prose prose-sm max-w-none leading-8 text-slate-700 dark:prose-invert dark:text-slate-300"
                dangerouslySetInnerHTML={{ __html: activeLesson.content }}
              />
            ) : (
              <div className="rounded-[28px] border-2 border-dashed border-slate-300 p-10 text-center dark:border-white/10">
                <BookOpen className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                <h3 className="text-xl font-black">لا يوجد شرح نصي لهذا الدرس</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  اعتمد على الفيديو والمرفقات والملاحظات لتثبيت الفهم.
                </p>
              </div>
            )
          )}

          {activeTab === "resources" && (
            activeLesson.attachments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeLesson.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-2xl bg-orange-500/10 p-3 text-orange-600 dark:text-orange-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {attachment.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {attachment.fileType} • {bytesToMegaBytes(attachment.fileSize)}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="rounded-2xl border-slate-200 dark:border-white/10"
                      onClick={() => window.open(attachment.fileUrl, "_blank")}
                    >
                      <Download className="ml-2 h-4 w-4" />
                      تحميل
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border-2 border-dashed border-slate-300 p-10 text-center dark:border-white/10">
                <Download className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                <h3 className="text-xl font-black">لا توجد مرفقات لهذا الدرس</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  عندما يضيف المدرس ملفات مساعدة ستظهر هنا مباشرة.
                </p>
              </div>
            )
          )}

          {activeTab === "qna" && (
            <div className="space-y-6">
              <div className="rounded-[28px] bg-slate-50 p-5 dark:bg-white/[0.03]">
                <label className="mb-3 block text-xs font-bold text-slate-500 dark:text-slate-400">
                  اطرح سؤالًا حول هذا الدرس
                </label>
                <textarea
                  value={newQuestion}
                  onChange={(event) => setNewQuestion(event.target.value)}
                  placeholder="اكتب سؤالك بشكل واضح ليتمكن المدرس أو زملاؤك من مساعدتك..."
                  className="min-h-[130px] w-full rounded-[24px] border border-slate-200 bg-white p-4 text-sm leading-7 outline-none transition focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-slate-950/70"
                />
                <div className="mt-4 flex justify-end">
                  <Button
                    className="rounded-2xl bg-orange-500 text-white hover:bg-orange-600 px-8 h-12 shadow-lg shadow-orange-500/20 font-black"
                    disabled={postingQuestion || !newQuestion.trim()}
                    onClick={() => void postQuestion()}
                  >
                    {postingQuestion ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="ml-2 h-4 w-4" />
                    )}
                    إرسال الاستفسار
                  </Button>
                </div>
              </div>

              {questions.length > 0 ? (
                <div className="space-y-4">
                  {questions.map((question) => (
                    <div
                      key={question.id}
                      className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-sm font-black text-orange-600 dark:text-orange-300">
                          {question.user?.name?.charAt(0) || "؟"}
                        </div>
                        <div>
                          <p className="text-sm font-black">
                            {question.user?.name || "طالب"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(question.createdAt).toLocaleDateString("ar-EG", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {question.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border-2 border-dashed border-slate-300 p-10 text-center dark:border-white/10">
                  <MessageSquare className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                  <h3 className="text-xl font-black">لا توجد أسئلة حتى الآن</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                    كن أول من يفتح نقاشًا حول هذه الجزئية.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">ملاحظاتك الخاصة</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    أضف طابعًا زمنيًا من المشغل ثم دوّن الفكرة المهمة مباشرة.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl border-slate-200 dark:border-white/10"
                    onClick={addTimestampToNotes}
                  >
                    <Clock3 className="ml-2 h-4 w-4" />
                    إضافة طابع زمني
                  </Button>
                  <Button
                    className="rounded-2xl bg-orange-500 text-white hover:bg-orange-600"
                    disabled={savingNote}
                    onClick={() => void saveNote()}
                  >
                    {savingNote ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    )}
                    حفظ الملاحظات
                  </Button>
                </div>
              </div>

              <textarea
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="اكتب هنا أبرز الأفكار، القوانين، الأخطاء المتكررة، أو أسئلة المراجعة الخاصة بك..."
                className="min-h-[320px] w-full rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm leading-8 outline-none transition focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
              />
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-5">
              <div className="rounded-[28px] bg-gradient-to-l from-orange-500 to-amber-500 p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">
                      المساعد الدراسي الذكي
                    </h3>
                    <p className="mt-1 text-sm text-white/80">
                      استخدمه في التلخيص، بناء أسئلة تدريبية، أو استخراج
                      أهم ما يجب مراجعته بعد المشاهدة.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {aiPromptSuggestions.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendAiMessage(prompt)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-orange-500/30 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:text-orange-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex h-[420px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  {aiMessages.map((message, index) => (
                    <m.div
                      key={`${message.role}-${index}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-7",
                        message.role === "assistant"
                          ? "bg-white text-slate-700 dark:bg-slate-950/80 dark:text-slate-200"
                          : "mr-auto bg-orange-500 text-white"
                      )}
                    >
                      {message.content}
                    </m.div>
                  ))}

                  {aiLoading ? (
                    <div className="max-w-[85%] rounded-3xl bg-white px-4 py-3 text-sm text-slate-600 dark:bg-slate-950/80 dark:text-slate-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-slate-200 p-4 dark:border-white/10">
                  <div className="relative">
                    <Input
                      value={aiInput}
                      onChange={(event) => setAiInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void sendAiMessage();
                        }
                      }}
                      placeholder="اكتب سؤالك عن هذا الدرس..."
                      className="h-12 rounded-2xl border-slate-200 bg-white pl-12 dark:border-white/10 dark:bg-slate-950/80"
                    />
                    <button
                      type="button"
                      onClick={() => void sendAiMessage()}
                      disabled={!aiInput.trim() || aiLoading}
                      className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </m.div>
      </AnimatePresence>
    </section>
  );
}
