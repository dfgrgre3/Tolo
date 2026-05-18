'use client';

import { m } from 'framer-motion';

export function LoginFormHeader() {
  return (
    <div className="space-y-4 text-center lg:text-right">
      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-4xl font-black text-white tracking-tight">
          مرحباً بك <span className="text-primary">مجدداً</span>
        </h2>
      </m.div>
      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-400 font-medium text-lg"
      >
        أدخل بيانات الهوية الرقمية للمتابعة إلى حسابك
      </m.p>
    </div>
  );
}
