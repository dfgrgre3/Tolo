"use client";

import * as React from "react";
import { DataTable } from "@/components/admin/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Edit, Trash2, Award, Filter } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Achievement, rarityColors, categoryLabels, categoryOptions, rarityOptions } from "./types";

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
      header: "الإنجاز",
      cell: ({ row }) => {
        const achievement = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <Award className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium">{achievement.title}</p>
              <p className="text-sm text-muted-foreground">{achievement.key}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "rarity",
      header: "الندرة",
      cell: ({ row }) => {
        const rarity = row.getValue("rarity") as string;
        return (
          <Badge className={`${rarityColors[rarity]} text-white`}>
            {rarity}
          </Badge>
        );
      },
    },
    {
      accessorKey: "category",
      header: "الفئة",
      cell: ({ row }) => {
        const category = row.getValue("category") as string;
        return categoryLabels[category] || category;
      },
    },
    {
      accessorKey: "xpReward",
      header: "المكافأة",
      cell: ({ row }) => {
        const xp = row.getValue("xpReward") as number;
        return <span className="font-medium">{xp} XP</span>;
      },
    },
    {
      accessorKey: "isSecret",
      header: "سري",
      cell: ({ row }) => {
        const isSecret = row.getValue("isSecret") as boolean;
        return isSecret ? "نعم" : "لا";
      },
    },
    {
      id: "unlocked",
      header: "مفتوح",
      cell: ({ row }) => {
        const achievement = row.original;
        return <span>{achievement._count.users} مستخدم</span>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الإنشاء",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return new Date(date).toLocaleDateString("ar-EG");
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const achievement = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(achievement)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(achievement.id)}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4">
          <Input
            placeholder="البحث عن إنجاز..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="الفئة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">جميع الفئات</SelectItem>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rarityFilter} onValueChange={setRarityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="الندرة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">جميع الندر</SelectItem>
              {rarityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>{filteredAchievements.length} من {achievements.length} إنجاز</span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredAchievements}
        searchKey=""
        searchPlaceholder=""
      />
    </div>
  );
}
