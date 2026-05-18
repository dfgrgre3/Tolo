import { Shield } from 'lucide-react';
import Link from 'next/link';

export function PrivacyInfoPanel() {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 flex flex-col md:flex-row items-start gap-4">
      <div className="bg-indigo-500/20 p-3 rounded-xl shrink-0">
        <Shield className="h-6 w-6 text-indigo-400" />
      </div>
      <div className="flex-1">
        <h4 className="text-white font-bold mb-1">خصوصية بياناتك محمية</h4>
        <p className="text-slate-400 text-sm leading-relaxed">
          نحن نهتم بخصوصيتك. البيانات الأكاديمية مثل المدرسة والشعبة تستخدم فقط لتحسين تجربتك التعليمية. يمكنك إدارة ظهور هذه البيانات من{' '}
          <Link href="/settings/privacy" className="text-indigo-400 hover:text-indigo-300 transition-colors underline">
            صفحة الخصوصية
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
