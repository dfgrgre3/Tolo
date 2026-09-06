"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { useAuth } from "@/hooks/use-auth";

import { logger } from '@/lib/logger';

type DirectoryUser = {
  id: string;
  name: string;
  avatar?: string;
};

/** Unwraps the `{ success, data }` envelope used by the backend responses. */
function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export default function NewChatPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUsers = async () => {
      try {
        // Session-scoped directory: the backend excludes the caller based on
        // the JWT, so no userId is sent (IDOR/BOLA hardening).
        const res = await fetch("/api/community/users");
        if (res.ok) {
          const payload = await res.json();
          const data = unwrap<DirectoryUser[]>(payload);
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        logger.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAuthenticated]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter((user) => user.name.toLowerCase().includes(term));
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
                          <Image
                            src={user.avatar}
                            alt={user.name}
                            width={48}
                            height={48}
                            unoptimized
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg">{user.name.charAt(0)}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
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
