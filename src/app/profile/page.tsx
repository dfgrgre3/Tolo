"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  grade?: string;
  school?: string;
  createdAt: string;
};

type UserStats = {
  completedTasks: number;
  totalStudyTime: number; // in minutes
  coursesEnrolled: number;
  examsTaken: number;
  forumPosts: number;
  blogPosts: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    bio: "",
    grade: "",
    school: ""
  });

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setEditForm({
            name: userData.name,
            email: userData.email,
            bio: userData.bio || "",
            grade: userData.grade || "",
            school: userData.school || ""
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchUserStats = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/stats`);
        if (res.ok) {
          const statsData = await res.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }
    };

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUserData(), fetchUserStats()]);
      setLoading(false);
    };

    loadData();
  }, [userId]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        setIsEditing(false);
      } else {
        alert("حدث خطأ أثناء تحديث الملف الشخصي");
      }
    } catch (error) {
      console.error("Error updating user profile:", error);
      alert("حدث خطأ أثناء تحديث الملف الشخصي");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="px-4 py-12 flex justify-center">
        <div className="text-center">جاري التحميل...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-12 flex justify-center">
        <div className="text-center">المستخدم غير موجود</div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <section className="mx-auto max-w-4xl py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">الملف الشخصي</h1>
          <p className="text-muted-foreground">إدارة معلوماتك الشخصية ومتابعة تقدمك</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border p-6">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">{user.name.charAt(0)}</span>
                  )}
                </div>

                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-muted-foreground text-sm">{user.email}</p>

                <div className="mt-4 text-center">
                  {user.grade && <p className="text-sm">الصف: {user.grade}</p>}
                  {user.school && <p className="text-sm">المدرسة: {user.school}</p>}
                  <p className="text-sm text-muted-foreground mt-2">
                    انضم في {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <button 
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md w-full"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "إلغاء" : "تعديل الملف الشخصي"}
                </button>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Edit Form */}
            {isEditing ? (
              <div className="rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">تعديل المعلومات الشخصية</h3>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">
                      الاسم
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className="w-full border rounded-md px-3 py-2"
                      value={editForm.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1">
                      البريد الإلكتروني
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="w-full border rounded-md px-3 py-2"
                      value={editForm.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="grade" className="block text-sm font-medium mb-1">
                      الصف الدراسي
                    </label>
                    <input
                      id="grade"
                      name="grade"
                      type="text"
                      className="w-full border rounded-md px-3 py-2"
                      value={editForm.grade}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="school" className="block text-sm font-medium mb-1">
                      المدرسة
                    </label>
                    <input
                      id="school"
                      name="school"
                      type="text"
                      className="w-full border rounded-md px-3 py-2"
                      value={editForm.school}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium mb-1">
                      نبذة شخصية
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={3}
                      className="w-full border rounded-md px-3 py-2"
                      value={editForm.bio}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 border rounded-md"
                      onClick={() => setIsEditing(false)}
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                    >
                      حفظ التغييرات
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {/* Bio Section */}
                <div className="rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-3">نبذة شخصية</h3>
                  {user.bio ? (
                    <p className="text-muted-foreground">{user.bio}</p>
                  ) : (
                    <p className="text-muted-foreground">لا توجد نبذة شخصية مضافة</p>
                  )}
                </div>

                {/* Stats Section */}
                {stats && (
                  <div className="rounded-lg border p-6">
                    <h3 className="text-lg font-semibold mb-4">إحصائيات النشاط</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.completedTasks}</div>
                        <div className="text-sm text-muted-foreground">مهام مكتملة</div>
                      </div>
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{Math.floor(stats.totalStudyTime / 60)} ساعة</div>
                        <div className="text-sm text-muted-foreground">وقت الدراسة</div>
                      </div>
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.coursesEnrolled}</div>
                        <div className="text-sm text-muted-foreground">دورات مسجلة</div>
                      </div>
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.examsTaken}</div>
                        <div className="text-sm text-muted-foreground">امتحانات</div>
                      </div>
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.forumPosts}</div>
                        <div className="text-sm text-muted-foreground">مشاركات في المنتدى</div>
                      </div>
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.blogPosts}</div>
                        <div className="text-sm text-muted-foreground">مقالات في المدونة</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="rounded-lg border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">النشاط الأخير</h3>
                    <Link href="/activity" className="text-sm text-primary hover:underline">
                      عرض الكل
                    </Link>
                  </div>
                  <div className="space-y-3">
                    <div className="text-center text-muted-foreground py-8">
                      سيتم عرض النشاط الأخير هنا
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
