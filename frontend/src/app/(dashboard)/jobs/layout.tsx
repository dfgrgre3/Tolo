import type { Metadata } from 'next';
import React from 'react';
import { SITE } from '@thanawy/shared/site-config';
import { JobsShell } from '@/features/jobs/components/JobsShell';

export const metadata: Metadata = {
  title: `الوظائف | ${SITE.name}`,
  description: 'ابحث عن الوظائف المناسبة لك، احفظ الفرص، وتابع حالة طلبات التوظيف.',
  openGraph: {
    title: `الوظائف | ${SITE.name}`,
    description: `استكشف فرص العمل على منصة ${SITE.nameAr}`,
    type: 'website',
  },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <JobsShell>{children}</JobsShell>;
}
