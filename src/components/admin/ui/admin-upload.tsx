"use client";

import * as React from "react";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CHUNK_UPLOAD_THRESHOLD_BYTES = 512 * 1024 * 1024;
const CHUNK_SIZE_BYTES = 100 * 1024 * 1024;

interface UploadMetadata {
  durationSeconds?: number;
  durationMinutes?: number;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

interface AdminUploadProps {
  onUploadComplete: (url: string, metadata?: UploadMetadata) => void;
  accept?: string;
  label?: string;
  maxSize?: number;
}

export function AdminUpload({
  onUploadComplete,
  accept = "video/*,image/*",
  label = "رفع ملف",
  maxSize = 100 * 1024, // 100GB default
}: AdminUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const extractVideoDuration = React.useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) return undefined;
    
    setIsAnalyzing(true);
    return await new Promise<number | undefined>((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        video.removeAttribute("src");
        video.load();
        setIsAnalyzing(false);
      };

      // Set a timeout for analysis to avoid hanging
      const timeout = setTimeout(() => {
        cleanup();
        resolve(undefined);
      }, 15000);

      video.onloadedmetadata = () => {
        const duration = Number.isFinite(video.duration) ? video.duration : undefined;
        clearTimeout(timeout);
        cleanup();
        resolve(duration);
      };

      video.onerror = () => {
        clearTimeout(timeout);
        cleanup();
        resolve(undefined);
      };

      video.src = objectUrl;
    });
  }, []);

  const buildMetadata = React.useCallback(
    (file: File, durationSeconds?: number): UploadMetadata => ({
      durationSeconds,
      durationMinutes: durationSeconds ? Math.max(1, Math.ceil(durationSeconds / 60)) : undefined,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }),
    [],
  );

  const uploadSingleRequest = React.useCallback(
    (file: File, durationSeconds?: number) =>
      new Promise<void>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload", true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              onUploadComplete(response.fileUrl, buildMetadata(file, durationSeconds));
              resolve();
              return;
            }

            reject(new Error(response.details || response.error || "فشل رفع الملف"));
          } catch {
            reject(new Error(`خطأ في الخادم (Status: ${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error("خطأ في الاتصال بالخادم"));
        xhr.send(formData);
      }),
    [buildMetadata, onUploadComplete],
  );

  const uploadChunked = React.useCallback(
    async (file: File, durationSeconds?: number) => {
      const initResponse = await fetch("/api/upload/chunked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          chunkSize: CHUNK_SIZE_BYTES,
        }),
      });

      const initResult = await initResponse.json();
      if (!initResponse.ok || !initResult?.uploadId) {
        throw new Error(initResult?.error || initResult?.details || "فشل بدء الرفع المجزأ");
      }

      const uploadId = initResult.uploadId as string;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const start = chunkIndex * CHUNK_SIZE_BYTES;
        const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
        const chunk = file.slice(start, end);

        const chunkFormData = new FormData();
        chunkFormData.append("chunk", chunk, file.name);
        chunkFormData.append("uploadId", uploadId);
        chunkFormData.append("chunkIndex", String(chunkIndex));
        chunkFormData.append("totalChunks", String(totalChunks));

        const chunkResponse = await fetch("/api/upload/chunked", {
          method: "PUT",
          body: chunkFormData,
        });

        const chunkResult = await chunkResponse.json();
        if (!chunkResponse.ok) {
          throw new Error(chunkResult?.error || chunkResult?.details || "فشل رفع جزء من الملف");
        }

        setProgress(Math.round(((chunkIndex + 1) / totalChunks) * 95));
      }

      const completeResponse = await fetch("/api/upload/chunked", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId }),
      });

      const completeResult = await completeResponse.json();
      if (!completeResponse.ok) {
        throw new Error(completeResult?.error || completeResult?.details || "فشل تجميع الملف النهائي");
      }

      setProgress(100);
      onUploadComplete(completeResult.fileUrl, buildMetadata(file, durationSeconds));
    },
    [buildMetadata, onUploadComplete],
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`الملف كبير جداً. الحد الأقصى هو ${maxSize / 1024}GB.`);
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const durationSeconds = await extractVideoDuration(file);

      if (file.size > CHUNK_UPLOAD_THRESHOLD_BYTES) {
        await uploadChunked(file, durationSeconds);
      } else {
        await uploadSingleRequest(file, durationSeconds);
      }

      toast.success("تم رفع الملف بنجاح");
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "حدث خطأ غير متوقع أثناء الرفع";
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div
        onClick={() => !isUploading && !isAnalyzing && fileInputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-8 transition-all duration-500",
          isUploading || isAnalyzing 
             ? "pointer-events-none border-primary/40 bg-primary/5" 
             : "hover:border-primary hover:bg-primary/5 grayscale hover:grayscale-0",
          error ? "border-destructive/50 bg-destructive/5" : "border-muted-foreground/20 bg-muted/20",
          "shadow-2xl shadow-primary/5 backdrop-blur-xl"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
        />

        {isAnalyzing ? (
           <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
             <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full" />
             </div>
             <div className="text-center space-y-1">
                <p className="text-sm font-black text-primary animate-pulse">جاري تحليل محتوى الفيديو...</p>
                <p className="text-[10px] font-bold text-muted-foreground">نستخرج المدة الزمنية لك تلقائياً</p>
             </div>
           </div>
        ) : isUploading ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-[280px] animate-in fade-in zoom-in duration-300">
            <div className="relative h-20 w-20">
               <svg className="h-full w-full -rotate-90">
                 <circle
                   cx="40"
                   cy="40"
                   r="36"
                   stroke="currentColor"
                   strokeWidth="8"
                   fill="transparent"
                   className="text-muted/20"
                 />
                 <circle
                   cx="40"
                   cy="40"
                   r="36"
                   stroke="currentColor"
                   strokeWidth="8"
                   fill="transparent"
                   strokeDasharray={226.2}
                   strokeDashoffset={226.2 - (226.2 * progress) / 100}
                   className="text-primary transition-all duration-500 ease-out"
                   strokeLinecap="round"
                 />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center font-black text-primary text-lg">
                 {progress}%
               </div>
               <div className="absolute inset-0 blur-2xl bg-primary/10 rounded-full -z-10" />
            </div>
            <div className="text-center space-y-1">
               <p className="text-sm font-black text-primary tracking-tight">جاري رفع الملف للسحابة</p>
               <p className="text-[10px] font-bold text-muted-foreground italic">لا تغلق الصفحة حتى اكتمال الرفع</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center group">
            <div className="relative mb-2">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-primary/20 to-primary/5 p-5 text-primary transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-xl group-hover:shadow-primary/20">
                <Upload className="h-8 w-8" />
              </div>
              <div className="absolute -inset-2 blur-2xl bg-primary/10 rounded-full -z-10 group-hover:bg-primary/20 transition-all" />
            </div>
            <div className="space-y-1 transition-all group-hover:translate-y-1">
              <p className="text-lg font-black tracking-tight">{label}</p>
              <p className="text-xs font-bold text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                اسحب الملف هنا أو انقر للاختيار. الرفع يدعم الأحجام الكبيرة جداً تلقائياً.
              </p>
            </div>
          </div>
        )}

        {error ? (
          <div className="absolute top-4 left-4 p-2 rounded-full bg-destructive/10 text-destructive animate-bounce">
            <AlertCircle className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}