import type { Metadata } from "next";
import { SITE } from "@thanawy/shared/site-config";

// Server layout so the client forum-thread page below inherits intentional,
// indexable metadata (per-thread content stays client-rendered).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const canonical = `${SITE.url}/forum/post/${encodeURIComponent(id)}`;
  return {
    title: `نقاش | المنتدى | ${SITE.nameAr}`,
    description: `تابع هذا النقاش في منتدى منصة ${SITE.nameAr} وشارك رأيك.`,
    alternates: { canonical },
    openGraph: {
      title: `نقاش | المنتدى | ${SITE.nameAr}`,
      description: `تابع هذا النقاش في منتدى منصة ${SITE.nameAr}.`,
      type: "article",
      url: canonical,
    },
  };
}

export default function ForumPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
