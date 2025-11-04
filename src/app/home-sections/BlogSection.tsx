import Link from "next/link";
import { memo, useState, useEffect } from "react";
import { safeFetch } from "@/lib/safe-client-utils";

export const BlogSection = memo(function BlogSection() {
	const [posts, setPosts] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchPosts = async () => {
			try {
				const { data, error } = await safeFetch<any[]>(
					"/api/blog/posts?limit=2",
					undefined,
					[]
				);

				if (!error && data) {
					setPosts(data);
				} else {
					setPosts([]);
				}
			} catch (error) {
				console.error("Error fetching blog posts:", error);
				setPosts([]);
			} finally {
				setLoading(false);
			}
		};

		fetchPosts();
	}, []);

	return (
		<section className="mt-16" aria-labelledby="blog-heading">
			<h2 id="blog-heading" className="text-2xl font-bold mb-4 text-primary flex items-center gap-2">
				<span>المدونة</span>
				<span className="text-xl" aria-hidden="true">📰</span>
			</h2>
			{loading ? (
				<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
					<div className="rounded-lg border p-4 bg-card shadow-sm animate-pulse">
						<div className="h-4 bg-gray-200 rounded mb-2"></div>
						<div className="h-3 bg-gray-200 rounded"></div>
					</div>
					<div className="rounded-lg border p-4 bg-card shadow-sm animate-pulse">
						<div className="h-4 bg-gray-200 rounded mb-2"></div>
						<div className="h-3 bg-gray-200 rounded"></div>
					</div>
				</div>
			) : posts.length > 0 ? (
				<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
					{posts.map((post) => (
						<div key={post.id} className="rounded-lg border p-4 bg-card shadow-sm">
							<h3 className="font-semibold mb-2">{post.title || "مقال بدون عنوان"}</h3>
							<p className="text-sm text-muted-foreground">
								{post.excerpt || post.description || "لا يوجد وصف متاح."}
							</p>
							<Link 
								href={`/blog/${post.id || post.slug || 'post'}`} 
								className="text-primary text-xs mt-2 inline-block hover:underline"
							>
								اقرأ المزيد →
							</Link>
						</div>
					))}
				</div>
			) : (
				<p className="text-muted-foreground text-center py-8">لا توجد مقالات متاحة حالياً</p>
			)}
		</section>
	);
});
BlogSection.displayName = "BlogSection";

export default BlogSection;
