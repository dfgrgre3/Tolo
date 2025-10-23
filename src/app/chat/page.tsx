"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Layout } from "@/components/layout/Layout";

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
  avatar?: string;
  lastSeen?: string;
  isOnline?: boolean;
};

type Message = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  isRead: boolean;
};

type Conversation = {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline?: boolean;
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatUserId = params.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchConversations = async () => {
      try {
        const res = await fetch(`/api/chat/conversations/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    fetchConversations();
  }, [userId]);

  useEffect(() => {
    if (!userId || !chatUserId) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        // Get user info
        const userRes = await fetch(`/api/users/${chatUserId}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setSelectedUser(userData);
        }

        // Get messages
        const messagesRes = await fetch(`/api/chat/messages/${userId}/${chatUserId}`);
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          setMessages(messagesData);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [userId, chatUserId]);

  useEffect(() => {
    // Scroll to bottom of messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !chatUserId || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: userId,
          receiverId: chatUserId,
          content: newMessage.trim()
        }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages([...messages, newMsg]);
        setNewMessage("");

        // Update conversation list
        const updatedConversations = conversations.map(conv => 
          conv.userId === chatUserId 
            ? { ...conv, lastMessage: newMessage.trim(), lastMessageTime: new Date().toISOString(), unreadCount: 0 }
            : conv
        );
        setConversations(updatedConversations);
      } else {
        alert("حدث خطأ أثناء إرسال الرسالة");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("حدث خطأ أثناء إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    router.push(`/chat/${conversation.userId}`);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // If yesterday, show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "أمس";
    }

    // Otherwise, show date
    return date.toLocaleDateString();
  };

  return (
    <Layout showSidebar={false}>
      <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
        {/* Conversations List */}
        <div className="w-full md:w-1/3 flex flex-col border rounded-lg overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h1 className="text-xl font-bold">المحادثات</h1>
            <Link href="/chat/new" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm">
              محادثة جديدة
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length > 0 ? (
              conversations.map((conversation) => (
                <div 
                  key={conversation.id}
                  className={`p-4 border-b hover:bg-muted/50 cursor-pointer ${selectedUser?.id === conversation.userId ? 'bg-muted' : ''}`}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {conversation.avatar ? (
                          <img 
                            src={conversation.avatar} 
                            alt={conversation.name} 
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg">{conversation.name.charAt(0)}</span>
                        )}
                      </div>
                      {conversation.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium truncate">{conversation.name}</h3>
                        {conversation.lastMessageTime && (
                          <span className="text-xs text-muted-foreground">
                            {formatTime(conversation.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage || "لا توجد رسائل"}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <div className="text-4xl mb-2">💬</div>
                <p>لا توجد محادثات</p>
                <p className="text-sm mt-2">ابدأ محادثة جديدة من خلال البحث عن مستخدم</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="w-full md:w-2/3 flex flex-col border rounded-lg overflow-hidden">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {selectedUser.avatar ? (
                      <img 
                        src={selectedUser.avatar} 
                        alt={selectedUser.name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg">{selectedUser.name.charAt(0)}</span>
                    )}
                  </div>
                  {selectedUser.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"></div>
                  )}
                </div>
                <div>
                  <h2 className="font-medium">{selectedUser.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedUser.isOnline ? "متصل الآن" : selectedUser.lastSeen ? `آخر ظهور: ${formatTime(selectedUser.lastSeen)}` : "غير متصل"}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <div>جاري تحميل الرسائل...</div>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((message) => (
                    <div 
                      key={message.id}
                      className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.senderId === userId 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <p>{message.content}</p>
                        <div className={`text-xs mt-1 ${
                          message.senderId === userId 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`}>
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <div className="text-center text-muted-foreground">
                      <div className="text-4xl mb-2">💬</div>
                      <p>لا توجد رسائل</p>
                      <p className="text-sm mt-2">ابدأ المحادثة بإرسال رسالة</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border rounded-md px-4 py-2"
                    placeholder="اكتب رسالة..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                    disabled={!newMessage.trim() || sending}
                  >
                    {sending ? "جاري الإرسال..." : "إرسال"}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="text-5xl mb-4">💬</div>
              <h2 className="text-xl font-bold mb-2">مرحباً في الدردشة</h2>
              <p className="text-muted-foreground mb-6">اختر محادثة من القائمة لبدء الدردشة</p>
              <Link href="/teachers" className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
                البحث عن مستخدمين للدردشة
              </Link>
            </div>
          )}
        </div>
    </div>
    </Layout>
  );
}
