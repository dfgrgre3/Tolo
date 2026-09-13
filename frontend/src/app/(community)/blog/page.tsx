import type { Metadata } from "next";
import { SITE } from "@thanawy/shared/site-config";
import BlogClient from "./blog-client";
import type { BlogPost, BlogCategory } from "./blog-client";
import { apiClient } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";
import { z } from "zod";

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
const blogPostSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  title: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  authorName: z.string().optional(),
  author: z.object({ name: z.string().optional() }).optional().nullable(),
  categoryId: z.union([z.string(), z.number()]).optional(),
  categoryName: z.string().optional(),
  category: z.object({ name: z.string().optional() }).optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  publishedAt: z.string().optional(),
  readTime: z.coerce.number().optional(),
  views: z.coerce.number().optional(),
  tags: z.array(z.string()).optional(),
}).passthrough();

const blogCategorySchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  icon: z.string().optional(),
}).passthrough();

function mapBlogPost(item: unknown): BlogPost | null {
  const parsed = blogPostSchema.safeParse(item);
  if (!parsed.success) return null;
  const value = parsed.data;
  return {
    id: String(value.id ?? ""),
    title: value.title ?? "",
    excerpt: value.excerpt ?? "",
    content: value.content ?? "",
    authorName: value.authorName ?? value.author?.name ?? "",
    categoryId: String(value.categoryId ?? ""),
    categoryName: value.categoryName ?? value.category?.name ?? "",
    coverImageUrl: value.coverImageUrl ?? undefined,
    publishedAt: value.publishedAt ?? "",
    readTime: value.readTime ?? 0,
    views: value.views ?? 0,
    tags: value.tags ?? [],
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
    apiClient.get<unknown>("/blog/posts"),
    apiClient.get<unknown>("/blog/categories"),
  ]);

  let posts: BlogPost[] | undefined;
  if (postsResult.status === "fulfilled") {
    // نفس أشكال الاستجابة التي تتعامل معها الواجهة: مصفوفة مباشرة،
    // أو غلاف { posts, pagination }، أو غلاف { data } لم يُفرَّغ بعد.
    const payload = postsResult.value;
    const items = Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object"
        ? (payload as { posts?: unknown; data?: unknown }).posts ??
          (payload as { data?: unknown }).data
        : undefined;
    if (Array.isArray(items)) {
      posts = items.flatMap((item) => {
        const mapped = mapBlogPost(item);
        return mapped ? [mapped] : [];
      });
    }
  } else {
    logger.error("SSR: failed to load blog posts", postsResult.reason);
  }

  let categories: BlogCategory[] | undefined;
  if (categoriesResult.status === "fulfilled") {
    const payload = categoriesResult.value;
    const items = Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object"
        ? (payload as { data?: unknown; categories?: unknown }).data ??
          (payload as { categories?: unknown }).categories ?? []
        : [];
    if (Array.isArray(items)) {
      categories = items.flatMap((item) => {
        const parsed = blogCategorySchema.safeParse(item);
        return parsed.success
          ? [{
              id: String(parsed.data.id ?? ""),
              name: parsed.data.name ?? "",
              icon: parsed.data.icon ?? "",
            }]
          : [];
      });
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
