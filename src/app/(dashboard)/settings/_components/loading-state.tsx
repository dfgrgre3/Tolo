import { Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        <p className="text-sm text-slate-400">جاري تحميل بياناتك...</p>
      </div>
    </div>
  );
}
