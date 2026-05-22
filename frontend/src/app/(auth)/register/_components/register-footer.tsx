'use client';

import Link from 'next/link';
import { Fingerprint, Globe, Smartphone } from 'lucide-react';

export function RegisterFooter({ loginUrl }: { loginUrl: string }) {
  return (
    <div className="text-center space-y-12 pb-24">
      <p className="text-lg font-bold text-gray-500">
         لديك هوية بالفعل؟ {' '}
        <Link href={loginUrl} className="text-white font-black border-b-2 border-white/20 hover:border-primary hover:text-primary transition-all pb-1 ml-1">بوابة العـبور</Link>
      </p>
      <div className="flex items-center justify-between max-xl mx-auto opacity-20 px-8">
        {[
          { icon: Fingerprint, label: "Security Encrypted" },
          { icon: Globe, label: "Node Sync" },
          { icon: Smartphone, label: "Device Verified" }
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon size={20} className="text-primary" />
            <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
