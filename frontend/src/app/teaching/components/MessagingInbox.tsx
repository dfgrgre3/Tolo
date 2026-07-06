"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Send, User, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Conversation } from "../hooks/use-teaching-data";

interface MessagingInboxProps {
  conversations: Conversation[];
  onSendMessage: (convId: string, text: string) => void;
}

export default function MessagingInbox({ conversations, onSendMessage }: MessagingInboxProps) {
  const [activeConvId, setActiveConvId] = useState<string>(conversations[0]?.id || "");
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConv = conversations.find((c) => c.id === activeConvId);

  const filteredConversations = conversations.filter((c) =>
    c.participantName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = () => {
    if (!messageText.trim() || !activeConvId) return;
    onSendMessage(activeConvId, messageText);
    setMessageText("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages.length]);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-card h-[600px] grid grid-cols-1 md:grid-cols-3 text-right" dir="rtl">
      {/* Threads List Sidebar */}
      <div className="border-l border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/10">
        <div className="p-4 border-b border-slate-100 dark:border-slate-850">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث في الرسائل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-right pr-9 pl-3 py-2 border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850/60 p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">لا توجد محادثات</div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full flex gap-3 p-3 rounded-xl transition-all text-right items-start ${
                    isSelected ? "bg-primary/10 text-primary dark:bg-primary/20" : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                  }`}
                >
                  <Avatar className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-800">
                    <AvatarImage src={conv.participantAvatar} alt={conv.participantName} />
                    <AvatarFallback>{conv.participantName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{conv.participantName}</span>
                      <span className="text-[9px] text-slate-400">{conv.time}</span>
                    </div>
                    <p className={`text-[10px] truncate leading-normal ${isSelected ? "text-slate-700 dark:text-slate-350" : "text-slate-500"}`}>
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center mt-1">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Messages Pane */}
      <div className="col-span-2 flex flex-col h-full bg-card justify-between">
        {activeConv ? (
          <>
            {/* Active Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 rounded-full">
                  <AvatarImage src={activeConv.participantAvatar} alt={activeConv.participantName} />
                  <AvatarFallback>{activeConv.participantName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{activeConv.participantName}</div>
                  <div className="text-[9px] text-emerald-500 font-semibold">متصل حالياً</div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {activeConv.messages.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-2.5 max-w-[75%] ${msg.isMe ? "mr-auto flex-row-reverse" : ""}`}>
                  {!msg.isMe && (
                    <Avatar className="w-8 h-8 rounded-full">
                      <AvatarImage src={activeConv.participantAvatar} alt={activeConv.participantName} />
                      <AvatarFallback>{activeConv.participantName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="space-y-1">
                    <div
                      className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                        msg.isMe
                          ? "bg-primary text-white rounded-br-none"
                          : "bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-slate-400 block px-1 text-left">{msg.time}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/10">
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl text-slate-400">
                <Paperclip className="w-4.5 h-4.5" />
              </Button>
              <input
                type="text"
                placeholder="اكتب رسالتك للطالب هنا..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 text-right px-4 py-2 bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700 dark:text-slate-200"
              />
              <Button onClick={handleSend} size="icon" className="w-9 h-9 rounded-xl bg-primary text-white hover:bg-primary/95">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
            <User className="w-12 h-12 stroke-[1.5]" />
            <span className="text-xs">اختر محادثة لبدء التراسل مع طلابك</span>
          </div>
        )}
      </div>
    </div>
  );
}
