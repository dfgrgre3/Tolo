import type { Metadata } from 'next';
import React from 'react';
import { SITE } from '@shared/site-config';

export const metadata: Metadata = {
  title: `التعليم | ${SITE.name}`,
  description: `الكورسات، الامتحانات، المكتبة التعليمية، والمدرسين على منصة ${SITE.nameAr}`,
  openGraph: {
    title: `التعليم | ${SITE.name}`,
    description: `تصفح الكورسات والامتحانات والمكتبة التعليمية على منصة ${SITE.nameAr}`,
    type: 'website',
  },
};

export default function EducationGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
