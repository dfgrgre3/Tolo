import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, UserPlus, Target, Award, Zap } from "lucide-react";

interface RecentActivityProps {
  recentActivity: Array<{
    type: string;
    id: string;
    time: Date;
    title: string | null;
  }>;
}

const activityLabels: Record<string, string> = {
  user: "مستخدم جديد",
  exam: "امتحان مكتمل",
  achievement: "إنجاز جديد",
  challenge: "تحدي جديد",
};

const activityIcons: Record<string, { icon: typeof UserPlus; color: string; bg: string }> = {
  user: { icon: UserPlus, color: "text-blue-500", bg: "bg-blue-500/10" },
  exam: { icon: Target, color: "text-green-500", bg: "bg-green-500/10" },
  achievement: { icon: Award, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  challenge: { icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10" },
};

export function RecentActivity({ recentActivity }: RecentActivityProps) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">آخر النشاطات</CardTitle>
          <Badge variant="secondary" className="rounded-full text-xs">
            {recentActivity.length} نشاط
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => {
              const iconInfo = activityIcons[activity.type] || activityIcons.user;
              const Icon = iconInfo.icon;
              return (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconInfo.bg}`}>
                      <Icon className={`h-5 w-5 ${iconInfo.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{activityLabels[activity.type] || activity.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.title || "بدون عنوان"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(activity.time).toLocaleDateString("ar-EG", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Activity className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">لا توجد نشاطات حديثة</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
