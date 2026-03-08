import { Metadata } from 'next';
import Link from 'next/link';
import { Inter, Cairo } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const cairo = Cairo({ subsets: ['arabic'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Authentication | Thanawy Platform',
  description: 'Secure authentication system',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-gray-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden`}>
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse transition-all"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse animation-delay-2000 transition-all"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse animation-delay-4000 transition-all"></div>

      <div className="z-10 w-full max-w-4xl">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block hover:scale-105 transition-transform duration-300">
            <h1 className={`${cairo.className} text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 tracking-tight`}>
              ثانوي بلاتفورم
            </h1>
          </Link>
          <p className={`${cairo.className} mt-4 text-gray-400 font-medium text-lg`}>
            بوابتك التعليمية المميزة نحو التميز
          </p>
        </div>

        <div className="w-full">
          {children}
        </div>

        <p className={`${cairo.className} mt-12 text-center text-sm text-gray-500`}>
          &copy; {new Date().getFullYear()} Thanawy Educational Platform. كل الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
}
