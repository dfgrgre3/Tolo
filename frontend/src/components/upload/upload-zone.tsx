"use client";

import * as React from "react";
import { Upload, Loader2, AlertCircle, CheckCircle, X, FileIcon, Image, Video, Music, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpload, type UseUploadOptions } from "@/hooks/use-upload";
import { formatFileSize, isImageFile, isVideoFile, isAudioFile, isDocumentFile } from "@/lib/storage/client";

interface FileItem {
  file: File;
  id: string;
  preview?: string;
  status: "pending" | "uploading" | "completed" | "error";
  progress: number;
  error?: string;
  result?: { url: string; path: string };
}

export interface UploadZoneProps extends Omit<UseUploadOptions, "bucket"> {
  bucket: string;
  multiple?: boolean;
  maxFiles?: number;
  showFileList?: boolean;
  compact?: boolean;
  onFilesChange?: (files: FileItem[]) => void;
  className?: string;
  children?: React.ReactNode;
}

export function UploadZone({
  bucket,
  folder,
  allowedTypes = [],
  maxSize = 100 * 1024 * 1024,
  multiple = true,
  maxFiles = 10,
  showFileList = true,
  compact = false,
  onFilesChange,
  className,
  children,
  onProgress,
  onSuccess,
  onError,
}: UploadZoneProps) {
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { upload, uploadMultiple, isUploading, progress, reset, cancel } = useUpload({
    bucket,
    folder,
    allowedTypes,
    maxSize,
    onProgress: (p) => onProgress?.(p),
    onSuccess: (result) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === currentUploadingFile.current
            ? { ...f, status: "completed", progress: 100, result: { url: result.publicUrl, path: result.path } }
            : f
        )
      );
      onSuccess?.(result);
    },
    onError: (err) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === currentUploadingFile.current ? { ...f, status: "error", error: err.message } : f
        )
      );
      onError?.(err);
    },
  });

  const currentUploadingFile = React.useRef<File | null>(null);

  const validateFile = React.useCallback(
    (file: File): string | null => {
      if (allowedTypes.length > 0) {
        const isAllowed = allowedTypes.some((type) => {
          if (type.endsWith("/*")) return file.type.startsWith(type.slice(0, -1));
          return file.type === type;
        });
        if (!isAllowed) return `File type ${file.type} is not allowed`;
      }
      if (file.size > maxSize) return `File size exceeds ${formatFileSize(maxSize)}`;
      return null;
    },
    [allowedTypes, maxSize]
  );

  const handleFiles = React.useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: FileItem[] = [];

      for (const file of fileArray) {
        if (files.length + validFiles.length >= maxFiles) break;

        const error = validateFile(file);
        if (error) {
          onError?.(new Error(error));
          continue;
        }

        let preview: string | undefined;
        if (isImageFile(file)) {
          preview = URL.createObjectURL(file);
        }

        validFiles.push({
          file,
          id: crypto.randomUUID(),
          preview,
          status: "pending",
          progress: 0,
        });
      }

      setFiles((prev) => {
        const updated = [...prev, ...validFiles];
        onFilesChange?.(updated);
        return updated;
      });

      if (validFiles.length > 0 && !isUploading) {
        uploadMultiple(validFiles.map((f) => f.file));
      }
    },
    [files.length, maxFiles, validateFile, onError, uploadMultiple, isUploading, onFilesChange]
  );

  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      e.target.value = "";
    },
    [handleFiles]
  );

  const removeFile = React.useCallback((id: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      onFilesChange?.(updated);
      return updated;
    });
  }, [onFilesChange]);

  const retryFile = React.useCallback((id: string) => {
    const fileItem = files.find((f) => f.id === id);
    if (fileItem && fileItem.status === "error") {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "pending", progress: 0, error: undefined } : f))
      );
      upload(fileItem.file);
    }
  }, [files, upload]);

  const clearCompleted = React.useCallback(() => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.status !== "completed");
      onFilesChange?.(updated);
      return updated;
    });
  }, [onFilesChange]);

  const getFileIcon = (file: File) => {
    if (isImageFile(file)) return <Image className="h-5 w-5 text-green-500" />;
    if (isVideoFile(file)) return <Video className="h-5 w-5 text-blue-500" />;
    if (isAudioFile(file)) return <Music className="h-5 w-5 text-purple-500" />;
    if (isDocumentFile(file)) return <FileText className="h-5 w-5 text-orange-500" />;
    return <FileIcon className="h-5 w-5 text-gray-500" />;
  };

  if (compact) {
    return (
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-all",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 hover:border-primary hover:bg-primary/5",
          className
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          multiple={multiple}
          accept={allowedTypes.join(",") || undefined}
          className="hidden"
        />
        <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Drag & drop or click to upload</p>
          <p className="text-xs text-muted-foreground">
            {multiple ? "Multiple files" : "Single file"} • Max {formatFileSize(maxSize)}
          </p>
        </div>
        {isUploading && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{progress}%</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-xl border-2 border-dashed p-6 transition-all",
        isDragActive
          ? "border-primary bg-primary/5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-primary/10"
          : "border-muted-foreground/20 hover:border-primary hover:bg-primary/5",
        className
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple={multiple}
        accept={allowedTypes.join(",") || undefined}
        className="hidden"
        disabled={isUploading}
      />

      {children || (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-4 text-center"
        >
          <div className="relative">
            <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-4 text-primary">
              <Upload className="h-10 w-10" />
            </div>
            <div className="absolute inset-0 rounded-full blur-2xl bg-primary/10 -z-10" />
          </div>
          <div>
            <p className="text-lg font-semibold">Drag & drop files here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {multiple ? `Up to ${maxFiles} files` : "Single file"} • Max {formatFileSize(maxSize)} per file
            {allowedTypes.length > 0 && ` • Types: ${allowedTypes.join(", ")}`}
          </p>
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 flex items-end justify-center p-4 pointer-events-none">
          <div className="w-full max-w-md bg-background/95 backdrop-blur rounded-lg border p-4 shadow-lg animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Uploading...</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              onClick={cancel}
              className="mt-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showFileList && files.length > 0 && (
        <div className="mt-6 space-y-2 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Selected Files ({files.length})</h4>
            <div className="flex items-center gap-2">
              {files.some((f) => f.status === "completed") && (
                <button
                  onClick={clearCompleted}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear completed
                </button>
              )}
            </div>
          </div>
          {files.map((fileItem) => (
            <div
              key={fileItem.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                fileItem.status === "error" && "border-destructive/50 bg-destructive/5",
                fileItem.status === "completed" && "border-green-500/50 bg-green-500/5"
              )}
            >
              <div className="flex-shrink-0">{getFileIcon(fileItem.file)}</div>

              {fileItem.preview && fileItem.status !== "error" && (
                <img
                  src={fileItem.preview}
                  alt={fileItem.file.name}
                  className="h-12 w-12 rounded object-cover"
                />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(fileItem.file.size)} • {fileItem.file.type || "Unknown type"}
                </p>

                {fileItem.status === "uploading" && (
                  <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${fileItem.progress}%` }}
                    />
                  </div>
                )}

                {fileItem.status === "error" && (
                  <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fileItem.error}
                    <button
                      onClick={() => retryFile(fileItem.id)}
                      className="text-xs underline hover:no-underline"
                    >
                      Retry
                    </button>
                  </p>
                )}

                {fileItem.status === "completed" && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Uploaded successfully
                  </p>
                )}
              </div>

              <button
                onClick={() => removeFile(fileItem.id)}
                className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface SingleFileUploadProps extends Omit<UseUploadOptions, "bucket"> {
  bucket: string;
  value?: string;
  onChange?: (url: string) => void;
  placeholder?: string;
  className?: string;
}

export function SingleFileUpload({
  bucket,
  folder,
  allowedTypes = [],
  maxSize = 10 * 1024 * 1024,
  value,
  onChange,
  placeholder = "No file selected",
  className,
}: SingleFileUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(null);

  const { upload, isUploading, progress, error, reset } = useUpload({
    bucket,
    folder,
    allowedTypes,
    maxSize,
    onSuccess: (result) => {
      onChange?.(result.publicUrl);
      if (isImageFile({ type: result.metadata.type } as File)) {
        setPreview(result.publicUrl);
      }
    },
    onError: (err) => {
      console.error("Upload failed:", err);
    },
  });

  const handleFileSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        upload(file);
      }
    },
    [upload]
  );

  const handleRemove = React.useCallback(() => {
    onChange?.("");
    setPreview(null);
    reset();
  }, [onChange, reset]);

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium">File Upload</label>

      <div className="relative">
        <input
          type="file"
          onChange={handleFileSelect}
          accept={allowedTypes.join(",") || undefined}
          disabled={isUploading}
          className="hidden"
          id="single-file-upload"
        />

        <button
          type="button"
          onClick={() => document.getElementById("single-file-upload")?.click()}
          disabled={isUploading}
          className={cn(
            "w-full flex items-center justify-between rounded-lg border p-4 transition-all",
            isUploading ? "border-primary/40 bg-primary/5" : "border-muted-foreground/20 hover:border-primary hover:bg-primary/5",
            "cursor-pointer"
          )}
        >
          <div className="flex items-center gap-3">
            {preview && isImageFile({ type: "image/*" } as File) ? (
              <img src={preview} alt="Preview" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 text-left">
              <p className="font-medium">{preview ? "File uploaded" : placeholder}</p>
              <p className="text-sm text-muted-foreground">Click to {preview ? "replace" : "upload"}</p>
            </div>
          </div>

          {isUploading ? (
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm font-medium text-primary">{progress}%</span>
            </div>
          ) : preview ? (
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 text-muted-foreground hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {isUploading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && (
          <p className="mt-1 text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
}