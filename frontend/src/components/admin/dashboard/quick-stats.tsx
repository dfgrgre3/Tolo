import { Card, CardContent } from "@/components/ui/card";
import { Clock, TrendingUp, Calendar, ArrowUpRight } from "lucide-react";

interface QuickStatsProps {
  activity: {
    studyMinutes: number;
  };
  trends: {
    studyTime: number;
  };
  upcomingEventsCount: number;
}

export function QuickStats({ activity, trends, upcomingEventsCount }: QuickStatsProps) {
  return (
    <div className="lg:col-span-2 space-y-4">
      {/* Study Time */}
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10">
                <Clock className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">دراسة هذا الأسبوع</p>
                <p className="text-2xl font-bold">
                  {Math.round(activity.studyMinutes / 60)} <span className="text-sm font-normal text-muted-foreground">ساعة</span>
                </p>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>

      {/* Study Trend */}
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                trends.studyTime >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
              }`}>
                <TrendingUp className={`h-6 w-6 ${trends.studyTime >= 0 ? "text-emerald-500" : "text-red-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تغير في وقت الدراسة</p>
                <p className="text-2xl font-bold">
                  {trends.studyTime >= 0 ? "+" : ""}{trends.studyTime}<span className="text-sm font-normal text-muted-foreground">%</span>
                </p>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10">
                <Calendar className="h-6 w-6 text-sky-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">أحداث قادمة</p>
                <p className="text-2xl font-bold">{upcomingEventsCount}</p>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
