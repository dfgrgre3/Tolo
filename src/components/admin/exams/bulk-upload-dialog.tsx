"use client";

import * as React from "react";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Check, X, AlertTriangle, PlayCircle, Clock, Target } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Array<{ id: string; name: string; nameAr: string | null }>;
  onSuccess?: () => void;
}

interface QuestionPreview {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  points: number;
}

export function BulkUploadDialog({ open, onOpenChange, subjects, onSuccess }: BulkUploadDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<QuestionPreview[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [subjectId, setSubjectId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [duration, setDuration] = React.useState(60);
  const [difficulty, setDifficulty] = React.useState("MEDIUM");

  const parseCSV = (text: string): QuestionPreview[] => {
    // Simple CSV parser logic: question, opt1, opt2, opt3, opt4, correct_index, points, explanation
    const lines = text.split(/\r?\n/);
    const results: QuestionPreview[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const columns = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ''));
      if (columns.length < 6) continue;

      const [question, o1, o2, o3, o4, correctStr, pointsStr, explanation] = columns;
      const options = [o1, o2, o3, o4].filter(o => o);
      const correctIdx = parseInt(correctStr || "0");
      const points = parseInt(pointsStr || "1");

      results.push({
        question,
        options,
        correctAnswer: options[correctIdx] || options[0],
        explanation: explanation || "",
        points: isNaN(points) ? 1 : points,
      });
    }
    return results;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        if (selectedFile.name.endsWith(".json")) {
          const data = JSON.parse(text);
          setPreview(data);
        } else if (selectedFile.name.endsWith(".csv")) {
          setPreview(parseCSV(text));
        } else {
          toast.error("تنسيق الملف غير مدعوم. يرجى استخدام CSV أو JSON.");
        }
      } catch (err) {
        toast.error("خطأ في قراءة ملف البيانات.");
        console.error(err);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!subjectId || !title || preview.length === 0) {
      toast.error("يرجى ملء جميع البيانات وإضافة ملف صحيح.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/exams/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subjectId,
          duration,
          difficulty,
          questions: preview,
        }),
      });

      if (response.ok) {
        toast.success(`تم إنشاء مبارزة " ${title} " بنجاح مع ${preview.length} سؤال.`);
        onSuccess?.();
        onOpenChange(false);
        reset();
      } else {
        const err = await response.json();
        toast.error(err.error || "فشل في عملية الرفع الجماعي.");
      }
    } catch (err) {
      toast.error("خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setTitle("");
    setSubjectId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden p-0">
        <div className="flex h-[80vh]">
          {/* Left Panel: Configuration */}
          <div className="w-1/3 p-8 border-l border-white/5 space-y-6 overflow-y-auto" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <Upload className="w-6 h-6 text-primary" />
                الرفع الملكي (Bulk)
              </DialogTitle>
              <DialogDescription className="font-bold opacity-60">
                 حوّل ملفات Excel و JSON إلى مبارزات علمية فورية.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-60">موضوع المبارزة</label>
                 <Input 
                   value={title} 
                   onChange={e => setTitle(e.target.value)} 
                   placeholder="مثال: بطولة الفيزياء الكلاسيكية" 
                   className="rounded-xl border-white/10"
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-60">العلم التابع له</label>
                 <Select value={subjectId} onValueChange={setSubjectId}>
                   <SelectTrigger className="rounded-xl border-white/10">
                     <SelectValue placeholder="اختر المادة" />
                   </SelectTrigger>
                   <SelectContent>
                     {subjects.map(s => (
                       <SelectItem key={s.id} value={s.id}>{s.nameAr || s.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest opacity-60">مدة الاختبار (دقيقة)</label>
                   <Input 
                     type="number"
                     value={duration} 
                     onChange={e => setDuration(parseInt(e.target.value))} 
                     className="rounded-xl border-white/10"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest opacity-60">مستوى الصعوبة</label>
                   <Select value={difficulty} onValueChange={setDifficulty}>
                     <SelectTrigger className="rounded-xl border-white/10">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="EASY">مبتدئ</SelectItem>
                       <SelectItem value="MEDIUM">متوسط</SelectItem>
                       <SelectItem value="HARD">متقدم</SelectItem>
                       <SelectItem value="EXPERT">خبير</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>

               <div className="pt-4">
                 <label 
                  className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/10 rounded-2xl hover:bg-white/5 cursor-pointer transition-all"
                 >
                   <FileText className="w-8 h-8 opacity-40 mb-2" />
                   <span className="text-xs font-bold opacity-60">{file ? file.name : "اختر ملف (CSV, JSON)"}</span>
                   <input type="file" className="hidden" accept=".csv,.json" onChange={handleFileChange} />
                 </label>
               </div>
            </div>

            <DialogFooter className="pt-6">
              <AdminButton 
                onClick={handleUpload} 
                disabled={loading || preview.length === 0} 
                className="w-full h-12 rounded-xl text-md font-black"
                loading={loading}
              >
                بدء عملية التحميل 🏛️
              </AdminButton>
            </DialogFooter>
          </div>

          {/* Right Panel: Preview Table */}
          <div className="flex-1 bg-white/[0.02] p-8 overflow-y-auto" dir="rtl">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-primary flex items-center gap-3">
                  <PlayCircle className="w-5 h-5" />
                  معاينة المخطوطات المستوردة
                </h3>
                <Badge variant="outline" className="font-bold border-primary/20 text-primary">
                  {preview.length} سؤال تم اكتشافه
                </Badge>
             </div>

             {preview.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-[50vh] opacity-40 text-center">
                  <AlertTriangle className="w-12 h-12 mb-4" />
                  <p className="font-black">لم يتم رفع أي بيانات بعد.</p>
                  <p className="text-xs">ارفع ملفاً متوافقاً لرؤية الأسئلة هنا قبل الحفظ.</p>
               </div>
             ) : (
               <div className="space-y-4">
                  {preview.map((q, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-card/40 border border-white/5 space-y-3 group hover:border-primary/30 transition-all shadow-sm">
                       <div className="flex items-start justify-between gap-4">
                          <p className="font-bold leading-relaxed">{i + 1}. {q.question}</p>
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold shrink-0">{q.points || 1} XP</Badge>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, idx) => (
                            <div key={idx} className={`p-2 rounded-lg text-xs bg-muted/30 border ${opt === q.correctAnswer ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-500' : 'border-white/5 opacity-70'}`}>
                               {opt}
                               {opt === q.correctAnswer && <Check className="w-3 h-3 inline-block mr-2" />}
                            </div>
                          ))}
                       </div>
                       {q.explanation && (
                         <div className="text-[10px] text-muted-foreground bg-white/5 p-2 rounded-lg font-medium opacity-60">
                           <strong>الشرح الزمني:</strong> {q.explanation}
                         </div>
                       )}
                    </div>
                  ))}
               </div>
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
