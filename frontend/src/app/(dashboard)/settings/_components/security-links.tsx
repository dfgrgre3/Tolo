import Link from 'next/link';
import { Shield, ChevronRight, Globe } from 'lucide-react';

export function SecurityLinks() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Link href="/settings/security" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
            <Shield className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">إعدادات الأمان</p>
            <p className="text-xs text-slate-500">كلمة المرور والتحقق بخطوتين</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors" />
      </Link>

      <Link href="/settings/privacy" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
            <Globe className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">إعدادات الخصوصية</p>
            <p className="text-xs text-slate-500">التحكم في ظهور بياناتك</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors" />
      </Link>
    </div>
  );
}
