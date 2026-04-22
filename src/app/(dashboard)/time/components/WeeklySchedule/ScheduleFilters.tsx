import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Filter, Eye, EyeOff } from 'lucide-react';
import { BLOCK_TYPES } from './constants';

interface ScheduleFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: string;
  onFilterTypeChange: (type: string) => void;
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
    <div className="flex flex-wrap items-center gap-6 p-4 bg-[#0F172A]/40 backdrop-blur-xl border border-white/5 rounded-3xl">
      <div className="flex-1 min-w-[200px] relative group">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
        <Input
          placeholder="ابحث في الخطة..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10 bg-white/5 border-white/10 rounded-2xl focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-bold"
        />
      </div>
      
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-500" />
        <Select value={filterType} onValueChange={onFilterTypeChange}>
          <SelectTrigger className="w-[160px] bg-white/5 border-white/10 rounded-2xl font-bold focus:ring-emerald-500/20">
            <SelectValue placeholder="نوع النشاط" />
          </SelectTrigger>
          <SelectContent className="bg-[#0F172A] border-white/10 text-slate-200">
            <SelectItem value="all">كل الأنشطة</SelectItem>
            {BLOCK_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div 
        className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all"
        onClick={onShowCompletedToggle}
      >
        {showCompleted ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-slate-500" />}
        <Label className="font-bold cursor-pointer whitespace-nowrap">
          {showCompleted ? 'إخفاء المكتمل' : 'إظهار المكتمل'}
        </Label>
        <Checkbox
          id="showCompleted"
          checked={showCompleted}
          onCheckedChange={onShowCompletedToggle}
          className="hidden"
        />
      </div>
    </div>
  );
}
