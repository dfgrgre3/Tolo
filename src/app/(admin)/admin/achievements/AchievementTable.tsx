"use client";

import * as React from "react";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Award, Filter, Search, Star, Zap, Eye, EyeOff, Users, Calendar
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Achievement, rarityColors, categoryLabels, categoryOptions, rarityOptions, rarityLabels } from "./types";

interface AchievementTableProps {
  achievements: Achievement[];
  onEdit: (achievement: Achievement) => void;
  onDelete: (id: string) => void;
}

export function AchievementTable({ achievements, onEdit, onDelete }: AchievementTableProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [rarityFilter, setRarityFilter] = React.useState<string>("ALL");

  const filteredAchievements = React.useMemo(() => {
    return achievements.filter((achievement) => {
      const matchesSearch = achievement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          achievement.key.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "ALL" || achievement.category === categoryFilter;
      const matchesRarity = rarityFilter === "ALL" || achievement.rarity === rarityFilter;

      return matchesSearch && matchesCategory && matchesRarity;
    });
  }, [achievements, searchTerm, categoryFilter, rarityFilter]);

  const columns: ColumnDef<Achievement>[] = [
    {
      accessorKey: "title",
      header: "وسام الجدارة",
      cell: ({ row }) => {
        const achievement = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]`}>
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{achievement.title}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">{achievement.key}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "rarity",
      header: "درجة الندرة",
      cell: ({ row }) => {
        const rarity = row.getValue("rarity") as string;
        return (
          <Badge 
            variant="outline" 
            className={`font-black text-[10px] uppercase tracking-widest rounded-lg border-2 px-3 py-1 ${rarityColors[rarity]} text-white border-white/10`}
          >
            {rarityLabels[rarity] || rarity}
          </Badge>
        );
      },
    },
    {
      accessorKey: "category",
      header: "مجال البطولة",
      cell: ({ row }) => (
        <Badge variant="secondary" className="rounded-lg bg-primary/10 text-primary border-primary/20 font-black text-[10px] uppercase">
          {categoryLabels[row.original.category] || row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: "xpReward",
      header: "هالة الـ XP",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
          <span className="text-sm font-black">{row.original.xpReward} XP</span>
        </div>
      ),
    },
    {
      accessorKey: "isSecret",
      header: "طبيعة الوسام",
      cell: ({ row }) => {
        const isSecret = row.original.isSecret;
        return (
          <div className="flex items-center gap-2">
            {isSecret ? <EyeOff className="w-3.5 h-3.5 text-red-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-500" />}
            <span className={`text-[10px] font-black uppercase tracking-widest ${isSecret ? "text-red-500" : "text-emerald-500"}`}>
              {isSecret ? "وسام مشفر (سري)" : "شرف معلن"}
            </span>
          </div>
        );
      },
    },
    {
      id: "unlocked",
      header: "جيش الحاصلين",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-black">{row.original._count.users} محارب</span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الصياغة",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-xs font-black">{new Date(row.original.createdAt).toLocaleDateString("ar-EG")}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "العمليات",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={onEdit}
          onDelete={(a) => onDelete(a.id)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 px-6 py-4 bg-white/5 border-b border-white/10">
         <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="ابحث في سجلات الأوسمة، المجلدات، أو مفاتيح الاستدعاء..." 
              className="w-full bg-accent/20 border border-border rounded-xl h-11 px-11 text-sm font-bold focus:ring-1 ring-amber-500/50 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="flex items-center gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44 h-11 rounded-xl bg-accent/20 border-border font-bold">
                 <Filter className="w-4 h-4 ml-2 text-primary" />
                 <SelectValue placeholder="مجال البطولة" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10">
                <SelectItem value="ALL" className="font-bold cursor-pointer">جميع القاعات</SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="font-bold cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={rarityFilter} onValueChange={setRarityFilter}>
              <SelectTrigger className="w-44 h-11 rounded-xl bg-accent/20 border-border font-bold">
                 <Star className="w-4 h-4 ml-2 text-amber-500" />
                 <SelectValue placeholder="رتبة الندرة" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10">
                <SelectItem value="ALL" className="font-bold cursor-pointer">جميع الرتب</SelectItem>
                {rarityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="font-bold cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
         </div>
      </div>

      <AdminDataTable
        columns={columns}
        data={filteredAchievements}
        searchKey=""
        searchPlaceholder=""
      />
    </div>
  );
}
