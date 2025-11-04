import { Card, CardContent } from "@/shared/card";
import { Button } from "@/shared/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from 'lucide-react';
import { BLOCK_TYPES } from './constants';

interface ScheduleFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  showCompleted: boolean;
  onShowCompletedToggle: () => void;
}

export function ScheduleFilters({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  showCompleted,
  onShowCompletedToggle
}: ScheduleFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="البحث في الأحداث..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                {BLOCK_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onShowCompletedToggle}
            >
              {showCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

