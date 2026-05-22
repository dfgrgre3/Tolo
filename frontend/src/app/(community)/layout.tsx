import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'المجتمع | Tolo',
  description: 'المنتدى، المدونة، الفعاليات، والإعلانات على منصة تولو التعليمية',
  openGraph: {
    title: 'المجتمع | Tolo',
    description: 'تواصل مع زملائك في المجتمع التعليمي على منصة تولو',
    type: 'website',
  },
};

export default function CommunityGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
