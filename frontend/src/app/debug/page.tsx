'use client';

import Link from 'next/link';

export default function DebugPage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>✅ JavaScript يعمل!</h1>
      <p>إذا رأيت هذه الرسالة، فإن التطبيق يعمل بشكل صحيح</p>
      <p>
        <Link href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
          العودة إلى الصفحة الرئيسية
        </Link>
      </p>
    </div>
  );
}
