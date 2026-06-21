"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Eye, 
  Download, 
  Loader2, 
  Sparkles, 
  AlertTriangle,
  BookOpen
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

type Resource = { 
  id: string; 
  subject: string; 
  title: string; 
  url: string; 
  free: boolean; 
  type: string; 
  source?: string | null 
};

function ResourceCard({ resource }: { resource: Resource }) {
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [loadingSize, setLoadingSize] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!resource.url) return;
    
    // Check if URL represents a file we can get size for
    const isFile = resource.url.toLowerCase().endsWith(".pdf") || 
                   resource.url.toLowerCase().endsWith(".docx") || 
                   resource.url.toLowerCase().endsWith(".xlsx") ||
                   resource.url.includes("/storage/v1/object/public/");
                   
    if (!isFile) return;

    let active = true;
    setLoadingSize(true);

    fetch(resource.url, { method: "HEAD" })
      .then((res) => {
        if (!active) return;
        const sizeBytes = res.headers.get("content-length");
        if (sizeBytes) {
          const bytes = parseInt(sizeBytes, 10);
          if (isNaN(bytes)) return;
          if (bytes < 1024) setFileSize(`${bytes} B`);
          else if (bytes < 1024 * 1024) setFileSize(`${(bytes / 1024).toFixed(1)} KB`);
          else setFileSize(`${(bytes / (1024 * 1024)).toFixed(1)} MB`);
        }
      })
      .catch((err) => {
        console.debug("Failed to fetch resource file size:", err);
      })
      .finally(() => {
        if (active) setLoadingSize(false);
      });

    return () => {
      active = false;
    };
  }, [resource.url]);

  const isPdf = resource.url.toLowerCase().endsWith(".pdf") || resource.url.includes("/documents/");
  const googleDocsViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(resource.url)}&embedded=true`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-card/50 hover:bg-accent/10 transition-all duration-300 gap-4 shadow-sm hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground leading-snug">{resource.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cn(
              "px-2 py-0.5 rounded-full font-medium",
              resource.free ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}>
              {resource.free ? "مجانًا" : "مدفوع"}
            </span>
            {resource.source && (
              <span className="text-muted-foreground border-r pr-2 border-border">
                المصدر: {resource.source}
              </span>
            )}
            {loadingSize ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : fileSize ? (
              <span className="text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border/40">
                {fileSize}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0">
        {isPdf && (
          <>
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              title="معاينة سريعة دون استهلاك بيانات كبيرة"
            >
              <Eye className="h-4 w-4" />
              <span>معاينة</span>
            </button>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-6 rounded-2xl bg-background border-border">
                <DialogHeader className="pb-4 border-b border-border">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <span>معاينة: {resource.title}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>هذه المعاينة تعتمد على السحابة وتوفر استهلاك البيانات مقارنة بالتحميل الكامل للملف.</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 w-full relative bg-muted rounded-xl overflow-hidden mt-4 border border-border">
                  <iframe
                    src={googleDocsViewerUrl}
                    className="w-full h-full border-none"
                    title={resource.title}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Download className="h-4 w-4" />
          <span>تحميل {fileSize ? `(${fileSize})` : ""}</span>
        </a>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetch(`${API_URL}/resources`)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setResources(data);
        } else {
          logger.error("Fetched resources is not an array:", data);
          setError("تم استلام بيانات غير صالحة من الخادم.");
          setResources([]);
        }
      })
      .catch((err) => {
        logger.error("Failed to fetch resources:", err);
        setError("فشل في تحميل الموارد التعليمية.");
        setResources([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const groups = Array.isArray(resources)
    ? resources.reduce<Record<string, Resource[]>>((acc, r) => {
        (acc[r.subject] ||= []).push(r);
        return acc;
      }, {})
    : {};

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto space-y-8" dir="rtl">
      {/* Header section with Ambient Glow */}
      <div className="relative p-6 md:p-10 rounded-3xl border border-border bg-card/40 backdrop-blur-md overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative space-y-3 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <span>الموارد الدراسية والمذكرات</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            مجموعة واسعة من المذكرات والملخصات الدراسية المعتمدة لطلاب الثانوية العامة. يمكنك معاينة أي مذكرة مباشرة لتوفير استهلاك باقة الإنترنت، أو تحميلها للرجوع إليها بدون إنترنت.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-24 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">جاري جلب الموارد الدراسية من الأرشيف...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-destructive text-center space-y-3 max-w-md mx-auto">
          <p className="font-semibold">{error}</p>
        </div>
      ) : Object.keys(groups).length === 0 ? (
        <div className="text-center py-24 rounded-3xl border border-dashed border-border bg-card/20 space-y-3">
          <FileText className="h-12 w-12 text-muted-foreground/60 mx-auto" />
          <p className="text-muted-foreground font-medium">لا توجد موارد تعليمية متاحة حالياً.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {Object.entries(groups).map(([subject, list]) => (
            <div key={subject} className="rounded-2xl border border-border bg-card/20 p-5 space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
                <div className="w-1.5 h-5 bg-primary rounded-full" />
                <span>{subject}</span>
              </h2>
              <div className="space-y-3">
                {list.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
