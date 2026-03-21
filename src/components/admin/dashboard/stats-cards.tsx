import { StatsCard } from "@/components/admin/ui/stats-card";
import { Users, BookOpen, FileText, Trophy } from "lucide-react";

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
        value={stats.totalUsers.toLocaleString()}
        description={`${stats.newUsersToday} مستخدم جديد اليوم`}
        icon={Users}
        trend={trends.userGrowth !== 0 ? { value: Math.abs(trends.userGrowth), isPositive: trends.userGrowth > 0 } : undefined}
      />
      <StatsCard
        title="المواد الدراسية"
        value={stats.totalSubjects.toString()}
        description="مادة متاحة"
        icon={BookOpen}
      />
      <StatsCard
        title="الامتحانات"
        value={stats.totalExams.toString()}
        description="امتحان متاح"
        icon={FileText}
      />
      <StatsCard
        title="التحديات النشطة"
        value={stats.activeChallenges.toString()}
        description="تحدي جاري"
        icon={Trophy}
      />
    </div>
  );
}
