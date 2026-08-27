"use client";

import { useState } from "react";
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
interface ExportDataResponse {
  exportData: unknown;
}

export default function DataExportCard() {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await apiClient.post<ExportDataResponse>(apiRoutes.settings.privacyActions, {
        action: "export-data",
      });
      const blob = new Blob([JSON.stringify(res.exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thanawy-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
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
