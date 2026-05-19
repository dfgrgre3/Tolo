import { Card, CardContent } from "@/components/ui/card";
import { Target, FileText, Award } from "lucide-react";

interface ActivitySummaryProps {
  activity: {
    tasksCompleted: number;
    examsTaken: number;
    achievementsEarned: number;
  };
}

export function ActivitySummary({ activity }: ActivitySummaryProps) {
  const items = [
    { icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "مهام مكتملة", value: activity.tasksCompleted },
    { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10", label: "امتحانات مجتازة", value: activity.examsTaken },
    { icon: Award, color: "text-amber-500", bg: "bg-amber-500/10", label: "إنجازات مكتسبة", value: activity.achievementsEarned },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item, i) => (
        <Card key={i} className="group hover:shadow-md transition-all hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg} transition-transform group-hover:scale-110`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <span className="text-2xl font-bold">{item.value}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
