'use client';

import { useState } from 'react';
import { Copy, Download, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RecoveryCodesDisplayProps {
  codes: string[];
  onRegenerate?: () => Promise<void>;
  canRegenerate?: boolean;
}

export default function RecoveryCodesDisplay({
  codes,
  onRegenerate,
  canRegenerate = true,
}: RecoveryCodesDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showCodes, setShowCodes] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const copyCodes = () => {
    const codesText = codes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopied(true);
    toast.success('تم نسخ رموز الاسترداد');
    setTimeout(() => setCopied(false), 3000);
  };

  const downloadCodes = () => {
    const codesText = codes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تحميل رموز الاسترداد');
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;

    const confirmed = confirm(
      'هل أنت متأكد؟ هذا سيحذف جميع رموز الاسترداد القديمة ويولد رموز جديدة. لن تتمكن من استخدام الرموز القديمة.'
    );

    if (!confirmed) return;

    setIsRegenerating(true);
    try {
      await onRegenerate();
    } catch (error) {
      console.error('Regenerate error:', error);
      toast.error('فشل إعادة توليد الرموز');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white">رموز الاسترداد</h2>
        <p className="mt-2 text-sm text-slate-300">
          استخدم هذه الرموز للوصول إلى حسابك إذا فقدت وصولك لتطبيق المصادقة
        </p>
      </div>

      <div className="mb-6 rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-300 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-100">
            <p className="font-semibold mb-1">تحذير مهم:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>احفظ هذه الرموز في مكان آمن</li>
              <li>كل رمز يمكن استخدامه مرة واحدة فقط</li>
              <li>لا تشارك هذه الرموز مع أي شخص</li>
              <li>إذا فقدت هذه الرموز، يمكنك توليد رموز جديدة</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-slate-300">إظهار/إخفاء الرموز</span>
        <button
          onClick={() => setShowCodes(!showCodes)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
        >
          {showCodes ? (
            <EyeOff className="h-5 w-5 text-slate-300" />
          ) : (
            <Eye className="h-5 w-5 text-slate-300" />
          )}
        </button>
      </div>

      <div className="mb-6 rounded-xl bg-white/5 p-4">
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {codes.map((code, index) => (
            <div
              key={index}
              className="rounded bg-white/10 px-3 py-2 text-center text-white"
            >
              {showCodes ? code : '••••-••••'}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={copyCodes}
          className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/20 transition flex items-center justify-center gap-2"
        >
          <Copy className="h-4 w-4" />
          {copied ? 'تم النسخ!' : 'نسخ'}
        </button>
        <button
          onClick={downloadCodes}
          className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/20 transition flex items-center justify-center gap-2"
        >
          <Download className="h-4 w-4" />
          تحميل
        </button>
      </div>

      {canRegenerate && onRegenerate && (
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="w-full rounded-xl bg-orange-500/20 border border-orange-500/30 px-4 py-3 text-sm font-medium text-orange-200 hover:bg-orange-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جارٍ التوليد...
            </>
          ) : (
            'إعادة توليد رموز جديدة'
          )}
        </button>
      )}
    </div>
  );
}

