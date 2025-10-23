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
  grade?: string;
  school?: string;
  isOnline?: boolean;
};

export default function NewChatPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          // Filter out the current user
          const otherUsers = data.filter((user: User) => user.id !== userId);
          setUsers(otherUsers);
          setFilteredUsers(otherUsers);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userId]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = users.filter(user => 
      user.name.toLowerCase().includes(term) || 
      user.email.toLowerCase().includes(term) ||
      (user.grade && user.grade.toLowerCase().includes(term)) ||
      (user.school && user.school.toLowerCase().includes(term))
    );

    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const handleStartChat = (chatUserId: string) => {
    router.push(`/chat/${chatUserId}`);
  };

  return (
    <div className="px-4">
      <section className="mx-auto max-w-4xl py-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/chat" className="hover:text-primary">الدردشة</Link>
          <span>/</span>
          <span>محادثة جديدة</span>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">بدء محادثة جديدة</h1>
          <p className="text-muted-foreground">ابحث عن مستخدم لبدء محادثة</p>
        </div>

        {/* Search */}
        <div className="rounded-lg border p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث عن مستخدم..."
              className="w-full border rounded-md px-4 py-2 pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-2.5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="rounded-lg border p-12 text-center">
            <div>جاري التحميل...</div>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <div className="divide-y">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg">{user.name.charAt(0)}</span>
                        )}
                      </div>
                      {user.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.grade && <p className="text-xs text-muted-foreground">الصف: {user.grade}</p>}
                      {user.school && <p className="text-xs text-muted-foreground">المدرسة: {user.school}</p>}
                    </div>
                  </div>
                  <button
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                    onClick={() => handleStartChat(user.id)}
                  >
                    محادثة
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border p-12 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-lg font-medium mb-2">لا توجد نتائج</h3>
            <p className="text-muted-foreground">جرب تغيير معايير البحث</p>
          </div>
        )}
      </section>
    </div>
  );
}
