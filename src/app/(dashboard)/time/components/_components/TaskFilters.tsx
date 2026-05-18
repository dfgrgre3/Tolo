'use client';

import { Search, SortAsc, SortDesc, Tag } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { SubjectType } from './task-types';

interface TaskFiltersProps {
  readonly searchQuery: string;
  readonly onSearchChange: (value: string) => void;
  readonly filter: string;
  readonly onFilterChange: (value: string) => void;
  readonly selectedSubject: string;
  readonly onSubjectChange: (value: string) => void;
  readonly selectedPriority: string;
  readonly onPriorityChange: (value: string) => void;
  readonly sortBy: string;
  readonly onSortByChange: (value: string) => void;
  readonly sortOrder: 'asc' | 'desc';
  readonly onSortOrderToggle: () => void;
  readonly subjects: SubjectType[];
  readonly getAllTags: string[];
  readonly selectedTags: string[];
  readonly onTagToggle: (tag: string) => void;
}

export function TaskFilters({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  selectedSubject,
  onSubjectChange,
  selectedPriority,
  onPriorityChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  subjects,
  getAllTags,
  selectedTags,
  onTagToggle,
}: TaskFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث في المهام..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={filter} onValueChange={(value) => onFilterChange(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المهام</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSubject} onValueChange={onSubjectChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="المادة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المواد</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={onPriorityChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأولويات</SelectItem>
                <SelectItem value="URGENT">عاجلة</SelectItem>
                <SelectItem value="HIGH">مهمة</SelectItem>
                <SelectItem value="MEDIUM">متوسطة</SelectItem>
                <SelectItem value="LOW">منخفضة</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={onSortOrderToggle}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>

            <Select value={sortBy} onValueChange={(value) => onSortByChange(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">الموعد</SelectItem>
                <SelectItem value="created">الإنشاء</SelectItem>
                <SelectItem value="priority">الأولوية</SelectItem>
                <SelectItem value="title">العنوان</SelectItem>
                <SelectItem value="status">الحالة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {getAllTags.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600 self-center">العلامات:</span>
              {getAllTags.map((tag: string) => (
                <Button
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  size="sm"
                  onClick={() => onTagToggle(tag)}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
