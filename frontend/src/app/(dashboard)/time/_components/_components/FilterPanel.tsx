'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, SortAsc, SortDesc } from 'lucide-react';
import type { StudySession } from './study-session-types';
import { TIME_PERIODS, MOOD_LABELS, MOOD_ICONS } from './study-session-types';

interface FilterPanelProps {
  timePeriod: string;
  setTimePeriod: (value: string) => void;
  selectedSubject: string;
  setSelectedSubject: (value: string) => void;
  selectedMood: string;
  setSelectedMood: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  subjects: string[];
  sortBy: 'date' | 'duration' | 'productivity' | 'mood';
  setSortBy: (value: 'date' | 'duration' | 'productivity' | 'mood') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (value: 'asc' | 'desc') => void;
  filteredSessions: StudySession[];
  allSessions: StudySession[];
}

export function FilterPanel({
  timePeriod, setTimePeriod,
  selectedSubject, setSelectedSubject,
  selectedMood, setSelectedMood,
  searchQuery, setSearchQuery,
  subjects,
  sortBy, setSortBy,
  sortOrder, setSortOrder,
  filteredSessions, allSessions,
}: FilterPanelProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="time-period-select">الفترة الزمنية</Label>
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger id="time-period-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map(period => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subject-select">المادة</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger id="subject-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المواد</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="mood-select">المزاج</Label>
            <Select value={selectedMood} onValueChange={setSelectedMood}>
              <SelectTrigger id="mood-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {(Object.entries(MOOD_LABELS) as [string, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {MOOD_ICONS[value as keyof typeof MOOD_ICONS]} {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="search-input">البحث</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search-input"
                placeholder="البحث في الملاحظات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'date' | 'duration' | 'productivity' | 'mood')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">التاريخ</SelectItem>
                <SelectItem value="duration">المدة</SelectItem>
                <SelectItem value="productivity">الإنتاجية</SelectItem>
                <SelectItem value="mood">المزاج</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            {filteredSessions.length} من {allSessions.length} جلسة
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
