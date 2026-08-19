import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import type { BlogPost } from '../types';

interface BlogSectionProps {
  posts: BlogPost[];
  loading: boolean;
}

export function BlogSkeleton() {
  return (
    <div className=" bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden">
      <div className="aspect-video bg-slate-200" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-16 bg-slate-100 rounded" />
        <div className="h-4 w-full bg-slate-200 rounded" />
        <div className="h-3 w-3/4 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

/** Picks whichever image field the API populated. */
function coverOf(post: BlogPost): string | null {
  return post.featuredImage || post.featured_image || post.cover || null;
}

/** Formats a post's publish date, or returns null when it has none. */
function publishedDate(post: BlogPost): string | null {
  const raw = post.publishedAt || post.createdAt || post.created_at;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('ar-EG');
}

export function BlogSection({ posts, loading }: BlogSectionProps) {
  const featuredPost = posts[0];
  const sidePosts = posts.slice(1, 4);

  return (
    <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B]">
            أحدث المقالات من مدونتنا
          </h2>
          <p className="text-sm text-[#64748B] font-medium mt-1">
            نصائح وإرشادات لتعزيز مسارك التعليمي
          </p>
        </div>
        <Link
          href="/blog"
          className="flex items-center gap-1 text-sm font-bold text-[#0F766E] hover:text-[#115E59]"
        >
          عرض جميع المقالات <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <BlogSkeleton />
          </div>
          <div className="lg:col-span-5 space-y-4">
            {[1, 2].map((i) => (
              <BlogSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-[#F8FAFC] rounded-[12px] border border-[#E2E8F0]">
          <p className="text-sm text-[#64748B] font-bold">لا توجد مقالات منشورة حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {featuredPost && (
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden hover:border-[#0F766E] hover:shadow-lg group flex flex-col"
            >
              <div className="relative aspect-video bg-slate-200">
                {coverOf(featuredPost) ? (
                  <Image
                    src={coverOf(featuredPost) as string}
                    alt={featuredPost.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0F766E] to-blue-600" />
                )}
                <div className="absolute top-3 right-3 px-3 py-1 bg-[#F59E0B] text-white text-xs font-bold rounded-md">
                  مقال مميز
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#1E293B] group-hover:text-[#0F766E] mt-2 mb-3 line-clamp-2">
                    {featuredPost.title}
                  </h3>
                  <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed font-medium">
                    {featuredPost.excerpt || featuredPost.summary}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E2E8F0]">
                  <span className="text-xs text-[#64748B]">{publishedDate(featuredPost)}</span>
                  <span className="text-xs font-bold text-[#0F766E] flex items-center gap-1">
                    اقرأ المزيد <ChevronLeft className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          )}

          <div className="lg:col-span-5 flex flex-col gap-4">
            {sidePosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="bg-white border border-[#E2E8F0] p-4 rounded-[12px] hover:border-[#0F766E] hover:shadow-md group flex gap-4 items-start"
              >
                <div className="relative h-20 w-28 rounded-[8px] overflow-hidden bg-slate-100 shrink-0">
                  {coverOf(post) ? (
                    <Image src={coverOf(post) as string} alt={post.title} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-[#1E293B] group-hover:text-[#0F766E] line-clamp-2">
                    {post.title}
                  </h4>
                  <span className="text-[10px] text-[#64748B] mt-1 block">
                    {publishedDate(post)}
                  </span>
                  {post.excerpt && (
                    <p className="text-[11px] text-[#64748B] line-clamp-1 mt-1">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
