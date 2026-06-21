import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Inter, Cairo } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const cairo = Cairo({ subsets: ['arabic'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Authentication | Tolo',
  description: 'نظام الدخول إلى عالم Tolo',
};

export default function AuthLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300`}>
      {/* Premium Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-background overflow-hidden" aria-hidden="true">
        {/* Dynamic Gradient Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,0,255,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(0,255,128,0.05),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,0,128,0.05),transparent_50%)]" />
        
        {/* Subtle Grid Mesh */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      <div className="z-10 w-full max-w-4xl">
        <div className="text-center mb-10">
          <Link href="/" className="flex flex-col items-center gap-4 hover:scale-105 transition-transform duration-300">
            <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-card border border-border shadow-2xl">
              <Image src="/logo-tolo.jpg" alt="TOLO" fill sizes="80px" className="object-cover" />
            </div>
            <h1 className={`${cairo.className} text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 tracking-tighter`}>
              TOLO
            </h1>
          </Link>
          <p className={`${cairo.className} mt-4 text-muted-foreground font-medium text-lg`}>
            بوابتك التعليمية المميزة نحو التميز
          </p>
        </div>

        <div className="w-full">
          {children}
        </div>

        <p className={`${cairo.className} mt-12 text-center text-sm text-muted-foreground font-bold`}>
          &copy; {new Date().getFullYear()} Tolo Platform. كل الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
}
