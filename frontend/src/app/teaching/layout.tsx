import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'التدريس على Tolo',
  description: 'لوحة تحكم المعلمين على منصة Tolo',
};

export default function TeachingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div data-teaching-page="true">
      {children}
    </div>
  );
}
