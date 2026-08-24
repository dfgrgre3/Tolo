import Link from 'next/link';
import { Shield, ChevronRight, Globe } from 'lucide-react';

export function SecurityLinks() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Link href="/settings/security" className="flex items-center justify-between p-4 rounded-2xl bg-card/60 border border-border hover:bg-accent/50 hover:border-border transition-all group">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <Shield className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">إعدادات الأمان</p>
            <p className="text-xs text-muted-foreground">كلمة المرور والتحقق بخطوتين</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </Link>

      <Link href="/settings/privacy" className="flex items-center justify-between p-4 rounded-2xl bg-card/60 border border-border hover:bg-accent/50 hover:border-border transition-all group">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">إعدادات الخصوصية</p>
            <p className="text-xs text-muted-foreground">التحكم في ظهور بياناتك</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </Link>
    </div>
  );
}
