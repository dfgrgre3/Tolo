import { StatsCard } from "@/components/admin/ui/stats-card";
import { Users, BookOpen, FileText, Trophy } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface StatsCardsProps {
  stats: {
    totalUsers: number;
    totalSubjects: number;
    totalExams: number;
    activeChallenges: number;
    newUsersToday: number;
  };
  trends: {
    userGrowth: number;
  };
}

export function StatsCards({ stats, trends }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="إجمالي المستخدمين"
        value={formatNumber(stats.totalUsers)}
        description={`${stats.newUsersToday} مستخدم جديد اليوم`}
        icon={Users}
        trend={trends.userGrowth !== 0 ? { value: Math.abs(trends.userGrowth), isPositive: trends.userGrowth > 0 } : undefined}
      />
      <StatsCard
        title="المواد الدراسية"
        value={formatNumber(stats.totalSubjects)}
        description="مادة متاحة"
        icon={BookOpen}
      />
      <StatsCard
        title="الامتحانات"
        value={formatNumber(stats.totalExams)}
        description="امتحان متاح"
        icon={FileText}
      />
      <StatsCard
        title="التحديات النشطة"
        value={formatNumber(stats.activeChallenges)}
        description="تحدي جاري"
        icon={Trophy}
      />
    </div>
  );
}
