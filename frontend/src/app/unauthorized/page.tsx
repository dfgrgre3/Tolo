import Link from 'next/link';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 rounded-full border border-amber-500/30 bg-amber-500/10 p-4 text-amber-400">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="mb-3 text-3xl font-bold">Access denied</h1>
      <p className="mb-8 text-muted-foreground">
        Your account does not have permission to open this page.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          العودة للرئيسية
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/"
          className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
