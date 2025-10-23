"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const LOCAL_USER_KEY = "tw_user_id";
async function ensureUser(): Promise<string> {
	let id = localStorage.getItem(LOCAL_USER_KEY);
	if (!id) {
		const res = await fetch("/api/users/guest", { method: "POST" });
		const data = await res.json();
		id = data.id;
		localStorage.setItem(LOCAL_USER_KEY, id!);
	}
	return id!;
}

type ForumPost = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  categoryId: string;
  categoryName: string;
  createdAt: string;
  views: number;
  repliesCount: number;
  isPinned: boolean;
};

type ForumReply = {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
};

export default function ForumPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/forum/posts/${postId}`);
        if (res.ok) {
          const postData = await res.json();
          setPost(postData);
        } else {
          // Post not found
          router.push("/forum");
        }
      } catch (error) {
        console.error("Error fetching post:", error);
        router.push("/forum");
      }
    };

    const fetchReplies = async () => {
      try {
        const res = await fetch(`/api/forum/posts/${postId}/replies`);
        if (res.ok) {
          const repliesData = await res.json();
          setReplies(repliesData);
        }
      } catch (error) {
        console.error("Error fetching replies:", error);
      }
    };

    const incrementViews = async () => {
      try {
        await fetch(`/api/forum/posts/${postId}/view`, { method: "POST" });
      } catch (error) {
        console.error("Error incrementing views:", error);
      }
    };

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPost(), fetchReplies(), incrementViews()]);
      setLoading(false);
    };

    loadData();
  }, [postId, router]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !replyContent.trim() || !postId) return;

    setIsSubmittingReply(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          content: replyContent
        }),
      });

      if (res.ok) {
        const newReply = await res.json();
        setReplies([...replies, newReply]);
        setReplyContent("");

        // Update reply count
        if (post) {
          setPost({
            ...post,
            repliesCount: post.repliesCount + 1
          });
        }
      } else {
        alert("حدث خطأ أثناء إضافة الرد");
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      alert("حدث خطأ أثناء إضافة الرد");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-12 flex justify-center">
        <div className="text-center">جاري التحميل...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="px-4 py-12 flex justify-center">
        <div className="text-center">الموضوع غير موجود</div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <section className="mx-auto max-w-4xl py-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/forum" className="hover:text-primary">المنتدى التعليمي</Link>
          <span>/</span>
          <span>{post.title}</span>
        </div>

        {/* Post */}
        <div className="rounded-lg border p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center">
              <span className="font-medium text-primary">
                {post.authorName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl md:text-2xl font-bold">{post.title}</h1>
                {post.isPinned && (
                  <span className="text-primary" title="مثبت">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span>بواسطة: {post.authorName}</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{post.views}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{post.repliesCount}</span>
                </div>
              </div>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                {post.categoryName}
              </span>
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-line">{post.content}</p>
          </div>
        </div>

        {/* Replies */}
        <div className="rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">
              الردود ({replies.length})
            </h2>
          </div>

          {replies.length > 0 ? (
            <ul className="divide-y">
              {replies.map((reply) => (
                <li key={reply.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-muted w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="font-medium text-sm">
                        {reply.authorName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{reply.authorName}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(reply.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-line">{reply.content}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              لا توجد ردود بعد. كن أول من يرد!
            </div>
          )}
        </div>

        {/* Add Reply */}
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">إضافة رد</h2>
          <form onSubmit={handleReplySubmit}>
            <div className="mb-3">
              <textarea
                rows={4}
                className="w-full border rounded-md px-3 py-2"
                placeholder="اكتب ردك هنا..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                required
              ></textarea>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                disabled={isSubmittingReply || !replyContent.trim()}
              >
                {isSubmittingReply ? "جاري الإرسال..." : "إرسال الرد"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
