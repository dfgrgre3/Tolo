import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Filter, Search } from 'lucide-react';
import { Input } from '../ui/input';

/**
 * خصائص مكون رأس القسم
 */
export interface SectionHeaderProps {
  /** عنوان القسم */
  title: string;
  /** وصف القسم (اختياري) */
  description?: string;
  /** هل يتم عرض زر الإضافة؟ */
  showAddButton?: boolean;
  /** نص زر الإضافة */
  addButtonText?: string;
  /** دالة callback عند النقر على زر الإضافة */
  onAdd?: () => void;
  /** هل يتم عرض البحث؟ */
  showSearch?: boolean;
  /** placeholder للبحث */
  searchPlaceholder?: string;
  /** قيمة البحث */
  searchValue?: string;
  /** دالة callback عند تغيير البحث */
  onSearchChange?: (value: string) => void;
  /** هل يتم عرض زر الفلتر؟ */
  showFilter?: boolean;
  /** دالة callback عند النقر على زر الفلتر */
  onFilter?: () => void;
  /** عناصر إضافية في الرأس */
  actions?: React.ReactNode;
}

/**
 * مكون رأس القسم
 * 
 * رأس قابل لإعادة الاستخدام لأقسام لوحة التحكم
 * 
 * @example
 * ```tsx
 * <SectionHeader 
 *   title="المهام"
 *   description="إدارة مهامك اليومية"
 *   showAddButton
 *   addButtonText="إضافة مهمة"
 *   onAdd={() => console.log('Add task')}
 * />
 * ```
 */
export const SectionHeader: React.FC<SectionHeaderProps> = React.memo(({
  title,
  description,
  showAddButton = false,
  addButtonText = 'إضافة',
  onAdd,
  showSearch = false,
  searchPlaceholder = 'بحث...',
  searchValue = '',
  onSearchChange,
  showFilter = false,
  onFilter,
  actions,
}) => {
  return (
    <div className="flex flex-col space-y-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {showFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={onFilter}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              فلتر
            </Button>
          )}
          
          {showAddButton && (
            <Button
              onClick={onAdd}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {addButtonText}
            </Button>
          )}
          
          {actions}
        </div>
      </div>
      
      {showSearch && (
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pr-10"
          />
        </div>
      )}
    </div>
  );
});

SectionHeader.displayName = 'SectionHeader';

export default SectionHeader;
