"use client";

import * as React from "react";
import { cn, formatNumber } from "@/lib/utils";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,

  PaginationState } from
"@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { AdminButton, IconButton } from "./admin-button";
import { SearchInput } from "./admin-input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  FileX,
  Download,

  Columns,
  RefreshCw } from
"lucide-react";
import { ButtonGroup } from "./admin-button";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, X } from "lucide-react";

interface AdminDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  loading?: boolean;
  toolbar?: React.ReactNode;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
  actions?: {
    onExport?: () => void;
    onRefresh?: () => void;
    extraActions?: React.ReactNode;
  };
  emptyMessage?: {
    title?: string;
    description?: string;
  };
  className?: string;
  // Server-side pagination
  serverSide?: boolean;
  pageCount?: number;
  totalRows?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  // Bulk actions
  bulkActions?: {
    label: string;
    icon?: React.ElementType;
    onClick: (selectedRows: TData[]) => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    disabled?: boolean;
  }[];
}

export function AdminDataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "بحث...",
  pageSize = 10,
  loading = false,
  toolbar,
  selectable = false,
  onSelectionChange,
  actions,
  emptyMessage,
  className,
  // Server-side pagination
  serverSide = false,
  pageCount: serverPageCount,
  totalRows: serverTotalRows,
  currentPage: serverCurrentPage = 1,
  onPageChange,
  onPageSizeChange,
  // Bulk actions
  bulkActions
}: AdminDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: serverCurrentPage - 1,
    pageSize
  });

  // Sync pagination with server
  React.useEffect(() => {
    setPagination({ pageIndex: serverCurrentPage - 1, pageSize });
  }, [serverCurrentPage, pageSize]);

  const table = useReactTable({
    data,
    columns,
    pageCount: serverSide ? serverPageCount : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: serverSide ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: selectable,
    onPaginationChange: serverSide ?
    (updater) => {
      const newState = typeof updater === "function" ? updater(pagination) : updater;
      setPagination(newState);
      onPageChange?.(newState.pageIndex + 1);
      onPageSizeChange?.(newState.pageSize);
    } :
    setPagination,
    manualPagination: serverSide
  });

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelectionChange && selectable) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(
        (row) => row.original
      );
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, onSelectionChange, selectable, table]);

  const totalRows = serverSide ? serverTotalRows ?? 0 : table.getFilteredRowModel().rows.length;
  const currentPage = table.getState().pagination.pageIndex;
  const currentPageSize = table.getState().pagination.pageSize;
  const startRow = currentPage * currentPageSize + 1;
  const endRow = Math.min((currentPage + 1) * currentPageSize, totalRows);
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const pageCount = serverSide ? serverPageCount : table.getPageCount();
  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {searchKey &&
          <SearchInput
            placeholder={searchPlaceholder}
            value={table.getColumn(searchKey)?.getFilterValue() as string ?? ""}
            onChange={(e) =>
            table.getColumn(searchKey)?.setFilterValue(e.target.value)
            }
            className="w-64" />

          }
          {toolbar}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Floating Bulk Actions Bar */}
          <AnimatePresence>
            {selectable && selectedCount > 0 && bulkActions && bulkActions.length > 0 &&
            <motion.div
              initial={{ y: 100, opacity: 0, x: "-50%" }}
              animate={{ y: 0, opacity: 1, x: "-50%" }}
              exit={{ y: 100, opacity: 0, x: "-50%" }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-6 bg-neutral-900/90 backdrop-blur-2xl border border-white/10 px-8 py-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[400px]"
              dir="rtl">
              
                <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                  <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">تحديد العناصر</p>
                    <p className="text-sm font-black text-white">{selectedCount} محدد</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {bulkActions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => action.onClick(selectedRows)}
                      disabled={action.disabled}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50",
                        action.variant === "destructive" ?
                        "bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white" :
                        "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105"
                      )}>
                      
                        {Icon && <Icon className="h-4 w-4" />}
                        {action.label}
                      </button>);

                })}
                  
                  <button
                  onClick={() => table.resetRowSelection()}
                  className="p-2.5 rounded-xl border border-white/10 text-muted-foreground hover:text-white transition-colors"
                  title="إلغاء التحديد">
                  
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            }
          </AnimatePresence>

          {/* Row count badge */}
          <div className="hidden sm:flex items-center text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <span className="font-semibold text-foreground">{formatNumber(totalRows)}</span>
            <span className="mr-1">عنصر</span>
            {selectedCount > 0 && !bulkActions &&
            <span className="mr-2 text-primary">
                ({selectedCount} محدد)
              </span>
            }
          </div>

          {actions?.onRefresh &&
          <IconButton
            icon={RefreshCw}
            label="تحديث"
            variant="ghost"
            onClick={actions.onRefresh} />

          }

          {actions?.onExport &&
          <AdminButton variant="outline" size="sm" onClick={actions.onExport}>
              <Download className="h-4 w-4 ml-2" />
              تصدير
            </AdminButton>
          }

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AdminButton variant="outline" size="sm">
                <Columns className="h-4 w-4 ml-2" />
                الأعمدة
              </AdminButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              {table.
              getAllColumns().
              filter((column) => column.getCanHide()).
              map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                    
                      {column.id}
                    </DropdownMenuCheckboxItem>);

              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {actions?.extraActions}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) =>
            <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className="font-semibold text-xs uppercase tracking-wider">
                    
                      {header.isPlaceholder ?
                    null :
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    </TableHead>);

              })}
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {loading ?
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) =>
            <TableRow key={i}>
                  {columns.map((_, j) =>
              <TableCell key={j}>
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </TableCell>
              )}
                </TableRow>
            ) :
            table.getRowModel().rows?.length ?
            table.getRowModel().rows.map((row) =>
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
              className="transition-colors hover:bg-muted/30">
              
                  {row.getVisibleCells().map((cell) =>
              <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
              )}
                </TableRow>
            ) :

            <TableRow>
                <TableCell colSpan={columns.length} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                      <FileX className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">
                        {emptyMessage?.title || "لا توجد بيانات"}
                      </p>
                      <p className="text-sm mt-0.5">
                        {emptyMessage?.description || "لم يتم العثور على أي نتائج مطابقة"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            }
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalRows > 0 &&
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground order-2 sm:order-1">
            عرض <span className="font-medium text-foreground">{startRow}</span> إلى{" "}
            <span className="font-medium text-foreground">{endRow}</span> من{" "}
            <span className="font-medium text-foreground">{totalRows}</span> عنصر
          </div>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            {/* Page size selector */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">عرض</span>
              <Select
              value={String(currentPageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}>
              
                <SelectTrigger className="h-9 w-[70px] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {[5, 10, 20, 30, 50].map((size) =>
                <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                )}
                </SelectContent>
              </Select>
            </div>

            <ButtonGroup attached>
              <IconButton
              icon={ChevronsRight}
              label="الأولى"
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="hidden sm:flex" />
            
              <AdminButton
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}>
              
                <ChevronRight className="h-4 w-4 ml-1" />
                السابق
              </AdminButton>

              <div className="flex items-center gap-1 px-3 border-y bg-background">
                <span className="text-sm font-medium">
                  {currentPage + 1}
                </span>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground">
                  {pageCount}
                </span>
              </div>

              <AdminButton
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}>
              
                التالي
                <ChevronLeft className="h-4 w-4 mr-1" />
              </AdminButton>
              <IconButton
              icon={ChevronsLeft}
              label="الأخيرة"
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex((pageCount ?? 1) - 1)}
              disabled={!table.getCanNextPage()}
              className="hidden sm:flex" />
            
            </ButtonGroup>
          </div>
        </div>
      }
    </div>);

}

// Action column helper
interface ActionColumnProps<T> {
  row: T;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  extraActions?: Array<{
    icon: React.ElementType;
    label: string;
    onClick: (row: T) => void;
    variant?: "default" | "destructive";
  }>;
}

export function RowActions<T>({ row, onView, onEdit, onDelete, extraActions }: ActionColumnProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AdminButton variant="ghost" size="icon-sm">
          <SlidersHorizontal className="h-4 w-4" />
        </AdminButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        {onView &&
        <DropdownMenuItem onClick={() => onView(row)}>
            عرض التفاصيل
          </DropdownMenuItem>
        }
        {onEdit &&
        <DropdownMenuItem onClick={() => onEdit(row)}>
            تعديل
          </DropdownMenuItem>
        }
        {extraActions?.map((action, i) =>
        <DropdownMenuItem
          key={i}
          onClick={() => action.onClick(row)}
          className={action.variant === "destructive" ? "text-red-500" : ""}>
          
            <action.icon className="h-4 w-4 ml-2" />
            {action.label}
          </DropdownMenuItem>
        )}
        {onDelete &&
        <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
            onClick={() => onDelete(row)}
            className="text-red-500">
            
              حذف
            </DropdownMenuItem>
          </>
        }
      </DropdownMenuContent>
    </DropdownMenu>);

}