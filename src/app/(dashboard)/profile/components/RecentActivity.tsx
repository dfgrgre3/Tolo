"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  BookOpen,
  FileText,
  MessageSquare,
  Award,
  Clock,
  TrendingUp } from
"lucide-react";

interface Activity {
  id: string;
  type: "task" | "course" | "exam" | "forum" | "achievement";
  title: string;
  description: string;
  timestamp: string;
  xp?: number;
}

interface RecentActivityProps {
  activities: Activity[];
}

const activityIcons = {
  task: CheckCircle2,
  course: BookOpen,
  exam: FileText,
  forum: MessageSquare,
  achievement: Award
};

const activityBadgeColors = {
  task: "bg-green-500 text-white",
  course: "bg-blue-500 text-white",
  exam: "bg-purple-500 text-white",
  forum: "bg-orange-500 text-white",
  achievement: "bg-yellow-500 text-yellow-900"
};

const activityLabels = {
  task: "مهمة",
  course: "دورة",
  exam: "امتحان",
  forum: "منتدى",
  achievement: "إنجاز"
};

export function RecentActivity({ activities }: RecentActivityProps) {
  if (!activities || activities.length === 0) {
    return (
      <Card className="shadow-lg border-2 border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-5 w-5" />
            النشاط الأخير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا يوجد نشاط مؤخراً</p>
            <p className="text-sm mt-1">ابدأ بالتعلم والمشاركة في المنصة</p>
          </div>
        </CardContent>
      </Card>);

  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}>
      
      <Card className="shadow-xl border-2 border-primary/10">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-5 w-5" />
            النشاط الأخير
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const Icon = activityIcons[activity.type];
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r border hover:shadow-lg transition-shadow"
                  style={{
                    background: `linear-gradient(to right, var(--${activity.type}-50), var(--${activity.type}-100))`,
                    borderColor: `var(--${activity.type}-200)`
                  }}>
                  
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="flex-shrink-0">
                    
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white shadow-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-base">
                        {activity.title}
                      </h4>
                      <Badge className={activityBadgeColors[activity.type]}>
                        {activityLabels[activity.type]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(activity.timestamp).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      {activity.xp &&
                      <Badge variant="outline" className="text-xs">
                          +{activity.xp} XP
                        </Badge>
                      }
                    </div>
                  </div>
                </motion.div>);

            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>);

}
