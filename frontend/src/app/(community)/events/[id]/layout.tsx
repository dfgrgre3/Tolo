import type { Metadata } from "next";
import { SITE } from "@thanawy/shared/site-config";

// Server layout so the client event page below inherits intentional,
// indexable metadata (per-event details stay client-rendered).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const canonical = `${SITE.url}/events/${encodeURIComponent(id)}`;
  return {
    title: `فعالية تعليمية | الفعاليات | ${SITE.nameAr}`,
    description: `تفاصيل فعالية تعليمية على منصة ${SITE.nameAr} — سجل وشارك الآن.`,
    alternates: { canonical },
    openGraph: {
      title: `فعالية تعليمية | الفعاليات | ${SITE.nameAr}`,
      description: `تفاصيل فعالية تعليمية على منصة ${SITE.nameAr}.`,
      type: "website",
      url: canonical,
    },
  };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
