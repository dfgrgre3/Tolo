import type { Metadata } from "next";
import { SITE } from "@thanawy/shared/site-config";

// Server layout so the client post page below inherits intentional,
// indexable metadata. Per-post titles stay client-rendered (the post body
// requires a session); this gives crawlers a truthful route-family title
// instead of the generic root fallback.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const canonical = `${SITE.url}/blog/post/${encodeURIComponent(id)}`;
  return {
    title: `مقال تعليمي | المدونة | ${SITE.nameAr}`,
    description: `اقرأ هذا المقال التعليمي على مدونة منصة ${SITE.nameAr}.`,
    alternates: { canonical },
    openGraph: {
      title: `مقال تعليمي | المدونة | ${SITE.nameAr}`,
      description: `اقرأ هذا المقال التعليمي على مدونة منصة ${SITE.nameAr}.`,
      type: "article",
      url: canonical,
    },
  };
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
