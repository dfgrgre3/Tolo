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
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-gray-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden`}>
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-pulse transition-all"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-blue-900 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse animation-delay-2000 transition-all"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-pulse animation-delay-4000 transition-all"></div>

      <div className="z-10 w-full max-w-4xl">
        <div className="text-center mb-10">
          <Link href="/" className="flex flex-col items-center gap-4 hover:scale-105 transition-transform duration-300">
            <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-white border border-white/20 shadow-2xl">
              <Image src="/logo-tolo.jpg" alt="TOLO" fill sizes="80px" className="object-cover" />
            </div>
            <h1 className={`${cairo.className} text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 tracking-tighter`}>
              TOLO
            </h1>
          </Link>
          <p className={`${cairo.className} mt-4 text-gray-400 font-medium text-lg`}>
            بوابتك التعليمية المميزة نحو التميز
          </p>
        </div>

        <div className="w-full">
          {children}
        </div>

        <p className={`${cairo.className} mt-12 text-center text-sm text-gray-500 font-bold`}>
          &copy; {new Date().getFullYear()} Tolo Platform. كل الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
}
