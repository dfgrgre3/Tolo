"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Download } from "lucide-react";

interface MfaSetupBackupStepProps {
  success: string | null;
  backupCodes: string[];
  onDownload: () => void;
}

/** Final step of the MFA setup flow — shows backup recovery codes. */
export default function MfaSetupBackupStep({ success, backupCodes, onDownload }: MfaSetupBackupStepProps) {
  return (
    <CardContent className="grid gap-4">
      {success && (
        <Alert className="border-green-500 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>عملية ناجحة</AlertTitle>
          <AlertDescription dir="rtl">{success}</AlertDescription>
        </Alert>
      )}
      <div className="text-center text-sm font-semibold mb-2">
        يرجى حفظ رموز الاستعادة الاحتياطية هذه في مكان آمن. ستحتاجها لاستعادة حسابك في حال فقدان هاتفك:
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg font-mono text-center tracking-wide text-sm font-bold border border-slate-200 dark:border-slate-800">
        {backupCodes.map((bc, idx) => (
          <div key={idx} className="p-1 select-all">{bc}</div>
        ))}
      </div>
      <Button onClick={onDownload} className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900">
        <Download className="h-4 w-4 mr-2" /> تحميل رموز الاستعادة
      </Button>
      <Link href="/dashboard" className="w-full">
        <Button className="w-full">الذهاب للوحة التحكم</Button>
      </Link>
    </CardContent>
  );
}
