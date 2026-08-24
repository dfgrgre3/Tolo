import { Shield } from 'lucide-react';
import Link from 'next/link';

export function PrivacyInfoPanel() {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 flex flex-col md:flex-row items-start gap-4">
      <div className="bg-primary/15 p-3 rounded-xl shrink-0">
        <Shield className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1">
        <h4 className="text-foreground font-bold mb-1">خصوصية بياناتك محمية</h4>
        <p className="text-muted-foreground text-sm leading-relaxed">
          نحن نهتم بخصوصيتك. البيانات الأكاديمية مثل المدرسة والشعبة تستخدم فقط لتحسين تجربتك التعليمية. يمكنك إدارة ظهور هذه البيانات من{' '}
          <Link href="/settings/privacy" className="text-primary hover:text-primary/80 transition-colors underline">
            صفحة الخصوصية
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
