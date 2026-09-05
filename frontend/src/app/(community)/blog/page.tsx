import type { Metadata } from "next";
import { SITE } from "@thanawy/shared/site-config";
import BlogClient from "./blog-client";
import type { BlogPost, BlogCategory } from "./blog-client";
import { apiClient } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";

export const metadata: Metadata = {
  title: `المدونة | ${SITE.name}`,
  description:
    "حوليات الحكماء والباحثين — مقالات معمّقة وخبرات صاغها كبار الأكاديميين لطلاب الثانوية العامة لتنير دروب التفوق العلمي.",
  keywords: [
    "مدونة تعليمية",
    "مقالات ثانوية عامة",
    "نصائح دراسية",
    "خبرات أكاديمية",
    SITE.name,
  ],
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: `المدونة | ${SITE.name}`,
    description:
      "مقالات معمّقة وخبرات صاغها كبار الأكاديميين — هنا تُدون الخبرات وتُحفظ أسرار التفوق.",
    type: "website",
    url: "/blog",
  },
};

// يحوّل تدوينة خام من الـ API إلى الشكل الذي تتوقعه الواجهة (BlogPost).
function mapBlogPost(item: any): BlogPost {
  return {
    id: item.id ?? "",
    title: item.title ?? "",
    excerpt: item.excerpt ?? "",
    content: item.content ?? "",
    authorName: item.authorName ?? item.author?.name ?? "",
    categoryId: item.categoryId ?? "",
    categoryName: item.categoryName ?? item.category?.name ?? "",
    coverImageUrl: item.coverImageUrl,
    publishedAt: item.publishedAt ?? "",
    readTime: item.readTime ?? 0,
    views: item.views ?? 0,
    tags: Array.isArray(item.tags) ? item.tags : [],
  };
}

// نستخدم apiClient بدلاً من fetch الخام لأنه على الخادم لا يوجد مسار نسبي
// للمتصفح (/api/...) — apiClient يحوّل العنوان إلى العنوان المطلق للـ API
// الداخلي (INTERNAL_API_URL) تلقائياً. أي فشل هنا يُرجع undefined فتتكفل
// الواجهة بالجلب البديل من المتصفح. هذه بيانات عامة فقط (تدوينات وتصنيفات)
// أما بيانات المستخدم (userId) فتبقى تُجلب في المتصفح حصراً.
async function fetchBlogData(): Promise<{
  posts?: BlogPost[];
  categories?: BlogCategory[];
}> {
  const [postsResult, categoriesResult] = await Promise.allSettled([
    apiClient.get<any>("/blog/posts"),
    apiClient.get<any>("/blog/categories"),
  ]);

  let posts: BlogPost[] | undefined;
  if (postsResult.status === "fulfilled") {
    // نفس أشكال الاستجابة التي تتعامل معها الواجهة: مصفوفة مباشرة،
    // أو غلاف { posts, pagination }، أو غلاف { data } لم يُفرَّغ بعد.
    const payload = postsResult.value;
    const items = Array.isArray(payload)
      ? payload
      : payload?.posts ?? payload?.data;
    if (Array.isArray(items)) {
      posts = items.map(mapBlogPost);
    }
  } else {
    logger.error("SSR: failed to load blog posts", postsResult.reason);
  }

  let categories: BlogCategory[] | undefined;
  if (categoriesResult.status === "fulfilled") {
    const payload = categoriesResult.value;
    const items = Array.isArray(payload)
      ? payload
      : payload?.data ?? payload?.categories ?? [];
    if (Array.isArray(items)) {
      categories = items.map((item: any) => ({
        id: item.id ?? "",
        name: item.name ?? "",
        icon: item.icon ?? "",
      }));
    }
  } else {
    logger.error("SSR: failed to load blog categories", categoriesResult.reason);
  }

  return { posts, categories };
}

// التدوينات العامة تُجمَّع على الخادم حتى يصل HTML مكتاملاً لمحركات البحث
// ولتحسين LCP — البحث والتصفية والفرز يبقون تفاعليين في المتصفح.
export default async function BlogPage() {
  const { posts, categories } = await fetchBlogData();

  return (
    <BlogClient
      initialPosts={posts}
      initialCategories={categories}
    />
  );
}
