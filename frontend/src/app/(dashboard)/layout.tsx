import type { Metadata } from 'next';
import React from 'react';
import { SITE } from '@thanawy/shared/site-config';

export const metadata: Metadata = {
  title: `لوحة التحكم | ${SITE.name}`,
  description: 'لوحة التحكم الرئيسية - تتبع تقدمك الدراسي، المهام، الإنجازات، وجدول المذاكرة',
  openGraph: {
    title: `لوحة التحكم | ${SITE.name}`,
    description: `تتبع تقدمك الدراسي على منصة ${SITE.nameAr} التعليمية`,
    type: 'website',
  },
};

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
