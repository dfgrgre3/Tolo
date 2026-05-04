"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserModel } from "./types";
import { UserSegment } from "./broadcast-modal";
import { Users, Shield, Search, CheckSquare, Square, UserCheck, Users2, UserCog, GraduationCap, UserX, Clock, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface BroadcastAudienceProps {
  users: UserModel[];
  selectedUserIds: string[];
  onToggleUser: (userId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  segments?: UserSegment[];
  selectedSegment?: string | null;
  onSelectSegment?: (segmentId: string | null) => void;
}

const SEGMENT_ICONS: Record<string, typeof Users> = {
  all: Users2,
  active: Clock,
  inactive: UserX,
  students: GraduationCap,
  teachers: UserCog,
  admins: Shield,
  new: Sparkles,
};

const SEGMENT_COLORS: Record<string, string> = {
  all: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  active: "bg-green-500/20 text-green-500 border-green-500/30",
  inactive: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  students: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  teachers: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  admins: "bg-red-500/20 text-red-500 border-red-500/30",
  new: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
};

export function BroadcastAudience({ 
  users, 
  selectedUserIds,
  onToggleUser,
  onSelectAll,
  onDeselectAll,
  segments = [],
  selectedSegment,
  onSelectSegment,
}: BroadcastAudienceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredUsers = useMemo(() => {
    let filtered = [...users];
    
    // Apply segment filter first
    if (selectedSegment && selectedSegment !== "all") {
      const segment = segments?.find(s => s.id === selectedSegment);
      if (segment) {
        switch (segment.id) {
          case "students":
            filtered = filtered.filter(u => u.role === "STUDENT");
            break;
          case "teachers":
            filtered = filtered.filter(u => u.role === "TEACHER");
            break;
          case "admins":
            filtered = filtered.filter(u => u.role === "ADMIN");
            break;
          case "active":
            filtered = filtered.filter(u => {
              if (!u.lastLogin) return false;
              const daysSince = (Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
              return daysSince <= 7;
            });
            break;
          case "inactive":
            filtered = filtered.filter(u => {
              if (!u.lastLogin) return true;
              const daysSince = (Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
              return daysSince > 30;
            });
            break;
        }
      }
    }
    
    // Then apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(query) || 
        u.email?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [users, searchQuery, selectedSegment, segments]);

  const selectedCount = selectedUserIds.length;
  const visibleSelectedCount = filteredUsers.filter(u => selectedUserIds.includes(u.id)).length;
  const isAllVisibleSelected = filteredUsers.length > 0 && visibleSelectedCount === filteredUsers.length;

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
        <Users className="h-16 w-16 mb-4" />
        <p className="font-bold text-sm">جاري جلب بيانات المستخدمين المستهدفين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/20 rounded-3xl p-6 border border-white/5 backdrop-blur-xl group">
        <div className="flex items-center gap-4">
           <div className="p-4 bg-primary/10 rounded-2xl">
              <Shield className="w-8 h-8 text-primary" />
           </div>
           <div>
              <h4 className="text-xl font-black text-white">المستخدمين المستهدفين</h4>
              <p className="text-xs text-muted-foreground font-bold">
                تم اختيار {selectedCount} من أصل {users.length} مستخدم
              </p>
           </div>
        </div>
        
        <div className="flex gap-2">
           <div className="flex flex-col items-center justify-center px-6 py-2 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] font-black uppercase text-primary tracking-widest px-1">المستلمين</span>
              <span className="text-lg font-black text-white">{selectedCount} مستخدم</span>
           </div>
        </div>
      </div>

      {/* Segments */}
      {segments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {segments.map((segment) => {
            const Icon = SEGMENT_ICONS[segment.id] || Users;
            const isSelected = selectedSegment === segment.id;
            const colorClass = SEGMENT_COLORS[segment.id] || SEGMENT_COLORS.all;
            
            return (
              <button
                key={segment.id}
                onClick={() => onSelectSegment?.(isSelected ? null : segment.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black transition-all",
                  isSelected 
                    ? colorClass 
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{segment.name}</span>
                <Badge variant="secondary" className="text-[10px] h-5 min-w-5 flex items-center justify-center">
                  {segment.id === "all" ? users.length : 
                   segment.id === "students" ? users.filter(u => u.role === "STUDENT").length :
                   segment.id === "teachers" ? users.filter(u => u.role === "TEACHER").length :
                   segment.id === "admins" ? users.filter(u => u.role === "ADMIN").length :
                   segment.id === "active" ? users.filter(u => {
                     if (!u.lastLogin) return false;
                     const days = (Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
                     return days <= 7;
                   }).length :
                   segment.id === "inactive" ? users.filter(u => {
                     if (!u.lastLogin) return true;
                     const days = (Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
                     return days > 30;
                   }).length : 0}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={selectedSegment && selectedSegment !== "all" ? `بحث في ${segments.find(s => s.id === selectedSegment)?.name}...` : "بحث في المستخدمين..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-black/20 border-white/10 rounded-2xl h-12"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            disabled={filteredUsers.length === 0}
            className="rounded-xl border-white/10 hover:bg-white/5"
          >
            <CheckSquare className="h-4 w-4 ml-2" />
            اختيار الكل ({visibleSelectedCount}/{filteredUsers.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeselectAll}
            disabled={filteredUsers.length === 0}
            className="rounded-xl border-white/10 hover:bg-white/5"
          >
            <Square className="h-4 w-4 ml-2" />
            إلغاء الكل
          </Button>
        </div>
      </div>

      {/* Users Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-none">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 px-1">
          {filteredUsers.map((u) => {
            const isSelected = selectedUserIds.includes(u.id);
            return (
              <div 
                key={u.id} 
                onClick={() => onToggleUser(u.id)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-[1.5rem] border transition-all cursor-pointer group overflow-hidden relative",
                  isSelected 
                    ? "bg-primary/10 border-primary/30 hover:bg-primary/20" 
                    : "bg-white/[0.02] hover:bg-white/[0.08] border-white/5 hover:border-white/20"
                )}
              >
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={() => onToggleUser(u.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                
                <Avatar className="h-10 w-10 border-2 border-white/10 shadow-lg shrink-0">
                  <AvatarImage src={u.avatar || ""} className="object-cover" />
                  <AvatarFallback className="bg-primary/20 text-primary font-black text-xs">
                    {u.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="overflow-hidden flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-black truncate transition-colors",
                    isSelected ? "text-primary" : "group-hover:text-primary"
                  )}>
                    {u.name || "مستخدم"}
                  </p>
                  <p className="text-[9px] text-muted-foreground font-bold opacity-60 truncate tracking-tight">
                    {u.email}
                  </p>
                </div>

                {isSelected && (
                  <UserCheck className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
            <Search className="h-12 w-12 mb-4" />
            <p className="font-bold text-sm">
              {searchQuery ? "لا توجد نتائج مطابقة للبحث" : selectedSegment ? "لا يوجد مستخدمين في هذه الشريحة" : "لا يوجد مستخدمين"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
