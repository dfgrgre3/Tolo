"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight, Star, Crown, Medal, TrendingUp } from "lucide-react";
import Link from "next/link";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  badge?: string;
  isCurrentUser?: boolean;
}

interface LeaderboardCardProps {
  loading: boolean;
  leaderboard: LeaderboardEntry[];
}

export const LeaderboardCard = ({ loading, leaderboard }: LeaderboardCardProps) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <Star className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatScore = (score: number) => {
    return new Intl.NumberFormat("ar-EG").format(score);
  };

  return (
    <Card className="border-white/10 bg-black/30 shadow-lg h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-100">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>لوحة المتصدرين</span>
          </CardTitle>
          <Link href="/leaderboard">
            <Button variant="link" size="sm" className="text-primary">
              عرض الكل
              <ArrowRight className="h-4 w-4 mr-1 rtl:rotate-180" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className=" rounded-full h-6 w-6 border-b-2 border-yellow-500" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 font-bold mb-1">لوحة المتصدرين فارغة</p>
            <p className="text-sm text-gray-600">اكسب نقاط خبرة لتظهر في الترتيب</p>
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <div
              key={`${entry.rank}-${index}`}
              className={`flex items-center gap-4 p-3 rounded-xl ${
                entry.isCurrentUser ?
                "bg-yellow-500/10 border-2 border-yellow-500/40" :
                "bg-white/5 border border-white/10 hover:bg-white/[0.08]"
              }`}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-white/10">
                {getRankIcon(entry.rank)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-100 truncate">
                    {entry.badge} {entry.name}
                  </span>
                  {entry.isCurrentUser && (
                    <Badge className="bg-yellow-600 text-white text-xs shrink-0">أنت</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs text-gray-400">
                    {formatScore(entry.score)} نقطة خبرة
                  </span>
                </div>
              </div>
              <div className="text-lg font-bold text-gray-300">
                #{entry.rank}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderboardCard;
