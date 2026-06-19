"use client";

import React from "react";
import { m } from "framer-motion";
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
    <Card className="border-slate-200/80 shadow-lg h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>لوحة المتصدرين</span>
          </CardTitle>
          <Link href="/leaderboard">
            <Button variant="link" size="sm">
              عرض الكل
              <ArrowRight className="h-4 w-4 mr-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600" />
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <m.div
              key={`${entry.rank}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                entry.isCurrentUser ?
                "bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300" :
                "bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                {getRankIcon(entry.rank)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    {entry.badge} {entry.name}
                  </span>
                  {entry.isCurrentUser && (
                    <Badge className="bg-yellow-600 text-white text-xs">أنت</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-muted-foreground">
                    {formatScore(entry.score)} نقطة
                  </span>
                </div>
              </div>
              <div className="text-lg font-bold text-slate-700">
                #{entry.rank}
              </div>
            </m.div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderboardCard;
