"use client";

import * as React from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminButton } from "@/components/admin/ui/admin-button";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: Record<string, string>[]) => Promise<void>;
  title: string;
  description: string;
  columns: { key: string; label: string; required?: boolean }[];
  templateFileName?: string;
}

export function CsvImportDialog({
  open,
  onOpenChange,
  onImport,
  title,
  description,
  columns,
  templateFileName = "template.csv",
}: CsvImportDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<Record<string, string>[]>([]);
  const [isImporting, setIsImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]!.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("يرجى اختيار ملف CSV فقط");
      return;
    }

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCsv(text);

        if (rows.length === 0) {
          setError("الملف فارغ أو لا يحتوي على بيانات صالحة");
          return;
        }

        const requiredColumns = columns.filter((c) => c.required).map((c) => c.key);
        const missingColumns = requiredColumns.filter((col) => !Object.keys(rows[0]!).includes(col));

        if (missingColumns.length > 0) {
          setError(`الأعمدة المطلوبة مفقودة: ${missingColumns.join(", ")}`);
          return;
        }

        setPreview(rows.slice(0, 5));
      } catch {
        setError("فشل في قراءة الملف. تأكد من أنه ملف CSV صالح");
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file || preview.length === 0) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          const rows = parseCsv(text);
          await onImport(rows);
          toast.success(`تم استيراد ${rows.length} سجل بنجاح`);
          handleClose();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "فشل في استيراد البيانات");
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    } catch {
      toast.error("حدث خطأ أثناء الاستيراد");
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setError(null);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const header = columns.map((c) => c.key).join(",");
    const example = columns.map((c) => (c.required ? `example_${c.key}` : "")).join(",");
    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <AdminButton variant="outline" size="sm" onClick={downloadTemplate}>
              <FileText className="w-4 h-4 ml-2" />
              تحميل قالب CSV
            </AdminButton>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all",
              file ? "border-primary/40 bg-primary/5" : "border-muted-foreground/20 hover:border-primary hover:bg-primary/5"
            )}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <p className="font-bold">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB • {preview.length}+ سجل
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview([]);
                    setError(null);
                  }}
                  className="absolute top-2 right-2 p-1 hover:bg-accent rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <Upload className="w-12 h-12 text-muted-foreground" />
                <p className="font-bold">اسحب ملف CSV هنا أو انقر للاختيار</p>
                <p className="text-sm text-muted-foreground">الحد الأقصى: 10MB</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {preview.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-2">معاينة البيانات (أول 5 صفوف):</p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-accent/20">
                    <tr>
                      {columns.map((col) => (
                        <th key={col.key} className="p-2 text-right font-bold">
                          {col.label}
                          {col.required && <span className="text-red-500 mr-1">*</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-border/50">
                        {columns.map((col) => (
                          <td key={col.key} className="p-2">
                            {row[col.key] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <AdminButton type="button" variant="outline" onClick={handleClose}>
            إلغاء
          </AdminButton>
          <AdminButton
            type="button"
            onClick={handleImport}
            disabled={!file || isImporting}
            loading={isImporting}
          >
            استيراد {preview.length > 0 ? `(${preview.length}+ سجل)` : ""}
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
