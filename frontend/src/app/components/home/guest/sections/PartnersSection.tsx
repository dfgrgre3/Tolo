'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, RAIL } from '../design-system';

interface Partner {
  id: string;
  name: string;
  logo: string;
  category: string;
  description: string;
}

const PARTNERS: Partner[] = [
  {
    id: '1',
    name: 'AWS',
    logo: '☁️',
    category: 'Cloud Services',
    description: 'Amazon Web Services - Infrastructure Partner',
  },
  {
    id: '2',
    name: 'Google',
    logo: '🔍',
    category: 'Technology',
    description: 'Google Cloud Platform Partner',
  },
  {
    id: '3',
    name: 'Microsoft',
    logo: '🪟',
    category: 'Enterprise',
    description: 'Microsoft Azure Partnership',
  },
  {
    id: '4',
    name: 'GitHub',
    logo: '🐙',
    category: 'Development',
    description: 'Version Control & Collaboration',
  },
  {
    id: '5',
    name: 'Stripe',
    logo: '💳',
    category: 'Payments',
    description: 'Payment Processing Solutions',
  },
  {
    id: '6',
    name: 'Figma',
    logo: '🎨',
    category: 'Design',
    description: 'Design & Prototyping Tools',
  },
  {
    id: '7',
    name: 'Firebase',
    logo: '🔥',
    category: 'Backend',
    description: 'Real-time Database Solutions',
  },
  {
    id: '8',
    name: 'Slack',
    logo: '💬',
    category: 'Communication',
    description: 'Team Communication Platform',
  },
];

/**
 * Partner Logo Component
 */
function PartnerLogo({ partner }: { partner: Partner }) {
  return (
    <Link href={`/partners/${partner.id}`} className={`${RAIL.item} w-40`}>
      <div className="h-full flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] hover:border-[#0F766E] dark:hover:border-orange-500 hover:shadow-md dark:hover:shadow-orange-500/20 transition-all duration-150 group cursor-pointer">

        {/* Logo */}
        <div className="text-4xl mb-2.5 group-hover:scale-110 transition-transform">
          {partner.logo}
        </div>

        {/* Name */}
        <h3 className="text-sm font-bold text-[#1E293B] dark:text-white mb-1 text-center group-hover:text-[#0F766E] dark:group-hover:text-orange-500 transition-colors">
          {partner.name}
        </h3>

        {/* Category */}
        <p className="text-xs text-[#64748B] dark:text-slate-400 text-center">
          {partner.category}
        </p>
      </div>
    </Link>
  );
}

/**
 * PartnersSection
 *
 * Displays technology and industry partners
 */
export function PartnersSection() {
  return (
    <section className="py-10 bg-white border-b border-[#E2E8F0] dark:bg-slate-900 dark:border-slate-800">
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-[#F59E0B] dark:text-orange-500" />
            <h2 className={TYPOGRAPHY.sectionHeading}>
              شركاؤنا التقنيون
            </h2>
          </div>
          <p className={TYPOGRAPHY.sectionSubheading}>
            نتعاون مع أفضل الشركات التقنية العالمية
          </p>
        </div>

        {/* Partners Rail */}
        <div className={`${RAIL.container} justify-center flex-wrap sm:flex-nowrap mb-6`}>
          {PARTNERS.map((partner) => (
            <PartnerLogo key={partner.id} partner={partner} />
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-6 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-orange-500/10 dark:to-orange-600/10 border border-emerald-200 dark:border-orange-500/30 rounded-[12px]">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-base font-bold text-[#1E293B] dark:text-white mb-2">
              🤝 شراكات استراتيجية لتعليم أفضل
            </p>
            <p className="text-sm text-[#64748B] dark:text-slate-400 mb-4">
              نعمل مع أفضل الشركات التقنية لنقدم لك أحدث المهارات والأدوات المطلوبة في سوق العمل
            </p>
            <button className="px-6 py-2.5 bg-[#0F766E] dark:bg-orange-600 text-white font-bold text-sm rounded-[8px] hover:bg-[#115E59] dark:hover:bg-orange-700 transition-colors">
              تعرف على شراكاتنا
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
