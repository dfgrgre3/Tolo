"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileJson, Loader2 } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

/**
 * `POST /api/settings/privacy/actions` with `{action:"export-data"}` returns
 * `{exportData:{profile, preferences, securityLogs}}`
 * (backend/internal/infrastructure/api/handlers/protected/settings_handler_privacy_actions.go).
 * There is no PDF generator on the backend, so only the JSON export is
 * offered — a PDF button here would have nothing to call.
 */
interface ExportJobResponse { jobId: string; status: string; expiresAt: string; downloadUrl: string; }
interface ExportStatusResponse { jobId: string; status: "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED" | "CONSUMED"; expiresAt: string; }

export default function DataExportCard() {
  const [isExporting, setIsExporting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient.post<ExportJobResponse>(apiRoutes.settings.privacyActions, {
        action: "export-data",
      });
      const poll = async (): Promise<void> => {
        const status = await apiClient.get<ExportStatusResponse>(apiRoutes.settings.exportJobStatus(job.jobId));
        if (status.status === "COMPLETED") {
          // The one-time download URL is authenticated and expires server-side.
          window.location.assign(job.downloadUrl);
          return;
        }
        if (status.status !== "PROCESSING") throw new Error("Export job failed or expired");
        await new Promise<void>((resolve) => { timerRef.current = setTimeout(resolve, 1000); });
        return poll();
      };
      await poll();
      toast.success("تم تجهيز ملف بياناتك");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "تعذر تصدير البيانات، حاول مرة أخرى.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" /> تصدير بياناتك
          </CardTitle>
          <CardDescription>احصل على نسخة من بياناتك الشخصية وتفضيلاتك وسجل الأمان.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" className="justify-start gap-2" disabled={isExporting} onClick={handleExport}>
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
          تصدير بصيغة JSON
        </Button>
      </CardContent>
    </Card>
  );
}
