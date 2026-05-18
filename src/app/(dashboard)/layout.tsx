import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'لوحة التحكم | Tolo',
  description: 'لوحة التحكم الرئيسية - تتبع تقدمك الدراسي، المهام، الإنجازات، وجدول المذاكرة',
  openGraph: {
    title: 'لوحة التحكم | Tolo',
    description: 'تتبع تقدمك الدراسي على منصة تولو التعليمية',
    type: 'website',
  },
};

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
