import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface FiltersBarProps {
  searchTerm: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  experimentCount: number;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusChange,
  experimentCount
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Input
            placeholder="البحث في التجارب..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-full md:w-64"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        </div>
        
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="حالة التجربة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="active">نشطة</SelectItem>
            <SelectItem value="completed">منتهية</SelectItem>
            <SelectItem value="paused">موقوفة</SelectItem>
            <SelectItem value="draft">مسودة</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">التجارب:</span>
        <span className="text-sm font-bold">{experimentCount} تجربة</span>
      </div>
    </div>
  );
};
