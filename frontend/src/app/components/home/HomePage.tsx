'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { User } from '@/types/user';
import { useAuth } from '@/hooks/use-auth';
import GuestHome from './guest/GuestHome';
import { UserHomeSkeleton } from './dashboard/shared/UserHomeSkeleton';

// الزائر غير المسجّل لا يحتاج لوحة التحكم إطلاقًا. تحميلها عند الطلب فقط
// يمنع تصريف/تنزيل أقسام اللوحة الـ14 وشجرتها في أول فتح للصفحة الرئيسية.
const UserHome = dynamic(() => import('./dashboard/UserHome').then((m) => ({ default: m.UserHome })), {
  ssr: false,
  loading: () => <UserHomeSkeleton />,
});

interface HomePageProps {
  user?: User;
  /** تلميح من السيرفر بوجود جلسة، لتحديد ما يُعرض دون وميض بين الصفحتين. */
  hasSession?: boolean;
}

export default function HomePage({ user, hasSession }: HomePageProps) {
  const { user: authUser, isLoading } = useAuth();

  // Use the passed user prop or fall back to auth context
  const currentUser = user || (authUser as User | null);

  // تسخين chunk اللوحة في وقت الخمول: إن كان الزائر سيصبح مسجلاً هنا
  // (أو لديه جلسة قيد التحقق) ينزل الكود دون أن ينافس أي شيء، فيظهر
  // الـ dashboard فور جاهزية البيانات بدل انتقالة التنزيل.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const warm = () => {
      void import('./dashboard/UserHome');
    };
    let cancel: () => void;
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 4000 });
      cancel = () => window.cancelIdleCallback(id);
    } else {
      const t = setTimeout(warm, 2000);
      cancel = () => clearTimeout(t);
    }
    return cancel;
  }, []);

  // للزائر تُعرض صفحة الهبوط فورًا. أما صاحب الجلسة فيرى هيكل اللوحة
  // أثناء جلب بياناته، فلا يحدث وميض بين الصفحتين.
  if (!currentUser) {
    if (hasSession && isLoading) {
      return <UserHomeSkeleton />;
    }
    return <GuestHome />;
  }

  return <UserHome user={currentUser} />;
}
