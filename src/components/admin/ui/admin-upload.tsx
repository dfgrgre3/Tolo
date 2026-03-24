"use client";

import * as React from "react";
import { Upload, X, FileVideo, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";

interface AdminUploadProps {
  onUploadComplete: (url: string) => void;
  accept?: string;
  label?: string;
  maxSize?: number; // in MB
}

export function AdminUpload({ 
  onUploadComplete, 
  accept = "video/*,image/*", 
  label = "رفع ملف", 
  maxSize = 100 
}: AdminUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`الملف كبير جداً. الحد الأقصى هو ${maxSize} ميجابايت.`);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // We use XMLHttpRequest here because fetch doesn't support progress events natively without complex ReadableStream work
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload", true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        let errorMsg = "فشل رفع الملف";
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            toast.success("تم رفع الملف بنجاح");
            onUploadComplete(response.fileUrl);
            setIsUploading(false);
            return;
          } else {
            const response = JSON.parse(xhr.responseText);
            errorMsg = response.details || response.error || errorMsg;
          }
        } catch (e) {
          errorMsg = `خطأ في الخادم (Status: ${xhr.status})`;
        }
        
        setError(errorMsg);
        toast.error(errorMsg);
        setIsUploading(false);
      };

      xhr.onerror = () => {
        setError("خطأ في الاتصال بالخادم");
        toast.error("خطأ في الاتصال بالخادم");
        setIsUploading(false);
      };

      xhr.send(formData);
    } catch (err) {
      setIsUploading(false);
      setError("حدث خطأ غير متوقع");
      toast.error("حدث خطأ غير متوقع");
    }
  };

  return (
    <div className="space-y-2">
      <div 
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer",
          isUploading ? "pointer-events-none opacity-80" : "hover:border-primary hover:bg-primary/5",
          error ? "border-destructive/50 bg-destructive/5" : "border-muted-foreground/20 bg-muted/20"
        )}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept={accept} 
          className="hidden" 
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-black text-primary">{progress}% - جارِ الرفع...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-3 rounded-full bg-primary/10 text-primary mb-1">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold">{label}</p>
              <p className="text-[10px] text-muted-foreground font-medium">
                اسحب الملف هنا أو انقر للاختيار (كحد أقصى {maxSize} ميجابايت)
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-2 right-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
