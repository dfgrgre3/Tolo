"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import WeeklySchedule from "@/app/(dashboard)/time/components/WeeklySchedule";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureUser } from "@/lib/user-utils";
import { safeFetch } from "@/lib/safe-client-utils";
import { logger } from "@/lib/logger";

type Schedule = {
  id: string;
  userId: string;
  planJson: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
};

type SubjectEnrollment = {
  id: string;
  subject: string;
};

const EMPTY_SCHEDULE: Schedule = {
  id: "",
  userId: "",
  planJson: JSON.stringify({ timeBlocks: [] }),
  createdAt: "",
  updatedAt: ""
};

export default function SchedulePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSchedule = useCallback(async () => {
    setIsLoading(true);

    try {
      const ensuredUserId = userId || await ensureUser();

      if (!ensuredUserId) {
        setSchedule(EMPTY_SCHEDULE);
        return;
      }

      if (!userId) {
        setUserId(ensuredUserId);
      }

      const { data, error } = await safeFetch<Schedule>(
        `/api/schedule?userId=${encodeURIComponent(ensuredUserId)}`,
        undefined,
        EMPTY_SCHEDULE
      );

      const { data: subjectsData } = await safeFetch<SubjectEnrollment[]>(
        `/api/subjects?userId=${encodeURIComponent(ensuredUserId)}`,
        undefined,
        []
      );

      if (error) {
        logger.error("Failed to load schedule:", error);
      }

      if (data) {
        setSchedule({
          ...data,
          userId: data.userId || ensuredUserId,
          planJson: data.planJson || EMPTY_SCHEDULE.planJson
        });
      } else {
        setSchedule({
          ...EMPTY_SCHEDULE,
          userId: ensuredUserId
        });
      }

      setSubjects(
        Array.isArray(subjectsData)
          ? subjectsData
              .map((item) => item.subject)
              .filter((subject): subject is string => Boolean(subject))
          : []
      );
    } catch (error) {
      logger.error("Unexpected error while loading schedule:", error);
      setSchedule(EMPTY_SCHEDULE);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  return (
    <div className="container mx-auto space-y-6 px-4 py-6" dir="rtl">
      <Card className="border-primary/10 bg-gradient-to-l from-primary/5 via-background to-background">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <CalendarDays className="h-5 w-5" />
              <span className="text-sm font-medium">الجدول الدراسي</span>
            </div>
            <CardTitle className="text-2xl">تنظيم أسبوعك في مكان واحد</CardTitle>
            <CardDescription>
              أنشئ جلسات الدراسة، رتّب الأولويات، وعدّل الخطة بسهولة من العرض الأسبوعي أو الأجندة.
            </CardDescription>
          </div>

          <Button variant="outline" onClick={() => void loadSchedule()} disabled={isLoading}>
            <RefreshCw className={`ml-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </CardHeader>
      </Card>

      {isLoading || !userId ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border bg-card">
          <div className="text-center">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
            <p className="font-medium">جاري تحميل الجدول...</p>
          </div>
        </div>
      ) : (
        <WeeklySchedule
          schedule={schedule}
          subjects={subjects}
          userId={userId}
          onScheduleUpdate={(updatedSchedule) =>
            setSchedule((prev) => ({
              ...prev,
              ...updatedSchedule
            }))
          }
        />
      )}
    </div>
  );
}
