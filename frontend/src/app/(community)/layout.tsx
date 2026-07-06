import type { Metadata } from 'next';
import React from 'react';
import { SITE } from '@thanawy/shared/site-config';

export const metadata: Metadata = {
  title: `المجتمع | ${SITE.name}`,
  description: `المنتدى، المدونة، الفعاليات، والإعلانات على منصة ${SITE.nameAr} التعليمية`,
  openGraph: {
    title: `المجتمع | ${SITE.name}`,
    description: `تواصل مع زملائك في المجتمع التعليمي على منصة ${SITE.nameAr}`,
    type: 'website',
  },
};

export default function CommunityGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
