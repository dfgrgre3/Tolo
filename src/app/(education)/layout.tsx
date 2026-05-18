import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'التعليم | Tolo',
  description: 'الكورسات، الامتحانات، المكتبة التعليمية، والمدرسين على منصة تولو',
  openGraph: {
    title: 'التعليم | Tolo',
    description: 'تصفح الكورسات والامتحانات والمكتبة التعليمية على منصة تولو',
    type: 'website',
  },
};

export default function EducationGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
