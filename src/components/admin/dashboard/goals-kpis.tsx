"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AdminCard } from "../ui/admin-card";
import { AdminButton } from "../ui/admin-button";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Goal {
  id: string;
  title: string;
  description?: string;
  current: number;
  target: number;
  unit?: string;
  deadline?: Date;
  category?: "users" | "content" | "engagement" | "revenue" | "other";
  priority?: "low" | "medium" | "high";
}

interface GoalsKPIsProps {
  goals: Goal[];
  title?: string;
  className?: string;
  onAddGoal?: () => void;
  onEditGoal?: (id: string) => void;
  onDeleteGoal?: (id: string) => void;
  showAddButton?: boolean;
}

const categoryColors = {
  users: "text-blue-500",
  content: "text-green-500",
  engagement: "text-purple-500",
  revenue: "text-yellow-500",
  other: "text-gray-500",
};

const priorityColors = {
  low: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  high: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function formatDeadline(date: Date): string {
  const now = new Date();
  const diff = new Date(date).getTime() - now.getTime();
  const days = Math.ceil(diff / 86400000);

  if (days < 0) return "منتهي";
  if (days === 0) return "اليوم";
  if (days === 1) return "غداً";
  if (days < 7) return `بعد ${days} أيام`;
  if (days < 30) return `بعد ${Math.floor(days / 7)} أسابيع`;
  return `بعد ${Math.floor(days / 30)} أشهر`;
}

function GoalItem({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const progress = Math.min((goal.current / goal.target) * 100, 100);
  const isCompleted = goal.current >= goal.target;
  const remaining = goal.target - goal.current;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all",
        isCompleted ? "bg-green-500/5 border-green-500/20" : "bg-muted/30 border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            ) : (
              <Target
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  goal.category ? categoryColors[goal.category] : "text-primary"
                )}
              />
            )}
            <p className="font-medium text-sm truncate">{goal.title}</p>
          </div>

          {goal.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {goal.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <Progress
              value={progress}
              className={cn(
                "h-2 flex-1",
                isCompleted && "[&>div]:bg-green-500"
              )}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {progress.toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>
              {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
              {goal.unit && ` ${goal.unit}`}
            </span>
            {!isCompleted && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                متبقي {remaining.toLocaleString()}
              </span>
            )}
            {goal.deadline && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDeadline(goal.deadline)}
              </span>
            )}
          </div>
        </div>

        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-muted rounded">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(goal.id)}>
                  تعديل
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(goal.id)}
                  className="text-red-600"
                >
                  حذف
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {goal.priority && (
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              priorityColors[goal.priority]
            )}
          >
            {goal.priority === "high" ? "عاجل" : goal.priority === "medium" ? "متوسط" : "عادي"}
          </span>
        )}
      </div>
    </div>
  );
}

export function GoalsKPIs({
  goals,
  title = "الأهداف والمؤشرات",
  className,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
  showAddButton = true,
}: GoalsKPIsProps) {
  const completedGoals = goals.filter((g) => g.current >= g.target);
  const inProgressGoals = goals.filter((g) => g.current < g.target);

  // Sort by priority and deadline
  const sortedGoals = [...inProgressGoals].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = a.priority ? priorityOrder[a.priority] : 1;
    const bPriority = b.priority ? priorityOrder[b.priority] : 1;

    if (aPriority !== bPriority) return aPriority - bPriority;

    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }

    return 0;
  });

  return (
    <AdminCard className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {completedGoals.length}/{goals.length} مكتمل
          </p>
        </div>
        {showAddButton && onAddGoal && (
          <AdminButton variant="outline" size="sm" onClick={onAddGoal} icon={Plus}>
            إضافة هدف
          </AdminButton>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{goals.length}</p>
          <p className="text-xs text-muted-foreground">إجمالي</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-500">{completedGoals.length}</p>
          <p className="text-xs text-muted-foreground">مكتمل</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-500">{inProgressGoals.length}</p>
          <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
        </div>
      </div>

      {/* Goals list */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {sortedGoals.length === 0 && completedGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">لا توجد أهداف حالياً</p>
            {showAddButton && onAddGoal && (
              <AdminButton
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={onAddGoal}
                icon={Plus}
              >
                إضافة هدف جديد
              </AdminButton>
            )}
          </div>
        ) : (
          <>
            {sortedGoals.map((goal) => (
              <GoalItem
                key={goal.id}
                goal={goal}
                onEdit={onEditGoal}
                onDelete={onDeleteGoal}
              />
            ))}
            {completedGoals.length > 0 && (
              <>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    الأهداف المكتملة ({completedGoals.length})
                  </p>
                </div>
                {completedGoals.slice(0, 3).map((goal) => (
                  <GoalItem
                    key={goal.id}
                    goal={goal}
                    onEdit={onEditGoal}
                    onDelete={onDeleteGoal}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </AdminCard>
  );
}

// Mini KPI card for inline use
interface KPICardProps {
  title: string;
  value: number;
  target?: number;
  unit?: string;
  trend?: number;
  icon?: React.ElementType;
  className?: string;
}

export function KPICard({
  title,
  value,
  target,
  unit,
  trend,
  icon: Icon,
  className,
}: KPICardProps) {
  const progress = target ? Math.min((value / target) * 100, 100) : undefined;

  return (
    <AdminCard className={cn("p-4", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">
            {value.toLocaleString()}
            {unit && <span className="text-sm font-normal"> {unit}</span>}
          </p>
          {target && (
            <Progress value={progress} className="h-1.5 mt-2 w-24" />
          )}
        </div>
        {Icon && (
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1 mt-2 text-xs",
            trend > 0
              ? "text-green-600 dark:text-green-400"
              : trend < 0
              ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          )}
        >
          {trend > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : trend < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : null}
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )}
    </AdminCard>
  );
}
