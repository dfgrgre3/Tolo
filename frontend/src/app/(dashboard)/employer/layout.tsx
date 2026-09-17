import type { Metadata } from 'next';
import { JobsShell } from '@/features/jobs/components/JobsShell';

export const metadata: Metadata = {
  title: 'لوحة صاحب العمل',
  description: 'أدر شركاتك ووظائفك ومتقدميك.',
};

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return <JobsShell>{children}</JobsShell>;
}
