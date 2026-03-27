"use client";

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGamification } from '@/hooks/use-gamification';
import { AchievementToast } from '@/components/gamification/AchievementToast';
import {
  Trophy,
  Crown,
  Medal,

  Zap,

  Shield,
  Sparkles,

  Users,


  Clock } from

'lucide-react';
import { ensureUser } from "@/lib/user-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-6 transition-all",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function LeaderboardPage() {
  const [userId, setUserId] = useState<string>('');
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'friends'>('global');

  const {
    userProgress,
    achievements,
    leaderboard,
    currentAchievement,
    clearAchievementNotification,
    getUserRank,
    isLoading,
    error,
    refreshData
  } = useGamification({
    userId,
    enableNotifications: true
  });

  useEffect(() => {
    (async () => {
      const id = await ensureUser();
      setUserId(id || '');
    })();
  }, []);

  const userRank = getUserRank();
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];

  const memoizedSafeLeaderboard = useMemo(() => safeLeaderboard, [safeLeaderboard]);

  const topThree = useMemo(() => memoizedSafeLeaderboard.slice(0, 3), [memoizedSafeLeaderboard]);
  const others = useMemo(() => memoizedSafeLeaderboard.slice(3), [memoizedSafeLeaderboard]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="flex h-full w-full animate-pulse items-center justify-center rounded-full bg-primary/10">
             <Trophy className="h-10 w-10 text-primary" />
          </div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[130px] rounded-full opacity-40 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[130px] rounded-full opacity-30 -translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        
        {/* --- Header: Coliseum Entrance --- */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6">
          
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
            <Shield className="h-5 w-5" />
            <span>الحلبة الكبرى للمتفوقين</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
             مدرج <span className={STYLES.neonText}>خالد الطلبة</span> 🏛️
          </h1>
          <p className="text-lg text-gray-400 font-medium max-w-2xl mx-auto">
            هنا تُخلد أسماء الأبطال الذين قهروا رغبات الراحة وبنوا مجدهم بالعلم والاجتهاد. هل أنت مستعد لتحدي العظماء؟
          </p>
        </motion.div>

        {/* --- Top 3 Podium: The Champions --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pt-12">
           {topThree.map((entry, idx) => {
            const colors = [
            { border: 'border-amber-400/50', bg: 'bg-amber-400/10', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
            { border: 'border-slate-300/50', bg: 'bg-slate-300/10', text: 'text-slate-300', glow: 'shadow-slate-400/20' },
            { border: 'border-orange-500/50', bg: 'bg-orange-500/10', text: 'text-orange-500', glow: 'shadow-orange-600/20' }][
            idx];

            const isFirst = idx === 0;

            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.2 }}
                className={`${isFirst ? 'md:order-2 h-[450px]' : idx === 1 ? 'md:order-1 h-[380px]' : 'md:order-3 h-[350px]'} relative flex flex-col items-center justify-end pb-8`}>
                
                   {/* Avatar Group */}
                   <div className="absolute top-0 flex flex-col items-center gap-4">
                      <div className={`relative ${isFirst ? 'w-32 h-32' : 'w-24 h-24'} rounded-[2.5rem] p-1.5 ${colors.bg} border-2 ${colors.border} shadow-2xl transition-transform hover:scale-110 duration-500`}>
                         <div className="absolute inset-x-0 -top-8 flex justify-center">
                            {isFirst ? <Crown className="w-12 h-12 text-amber-500 animate-bounce drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" /> : <Medal className={`w-8 h-8 ${colors.text}`} />}
                         </div>
                         <div className="w-full h-full rounded-[2rem] bg-gradient-to-tr from-white/10 to-transparent flex items-center justify-center text-4xl font-black text-white">
                            {entry.username.charAt(0).toUpperCase()}
                         </div>
                         <div className="absolute -bottom-3 inset-x-4 h-6 px-4 bg-black border border-white/20 rounded-full flex items-center justify-center text-[10px] font-black transform skew-x-12">
                            LVL {entry.level}
                         </div>
                      </div>
                      <div className="text-center">
                         <h3 className="text-xl font-black text-white">{entry.username}</h3>
                         <p className={`${colors.text} font-black text-sm uppercase tracking-widest`}>{idx === 0 ? 'الإمبراطور' : idx === 1 ? 'الملك' : 'الفارس'}</p>
                      </div>
                   </div>

                   {/* Podium Block */}
                   <div className={`w-full ${isFirst ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/10'} border-t-2 rounded-t-[3rem] p-8 text-center backdrop-blur-3xl shadow-2xl relative overflow-hidden group`}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                      <div className="relative z-10 space-y-2">
                         <p className="text-3xl font-black text-white">{entry.totalXP.toLocaleString()}</p>
                         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">XP كلي</p>
                      </div>
                   </div>
                </motion.div>);

          })}
        </div>

        {/* --- Current Player Status: Contender's Badge --- */}
        {userProgress &&
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={STYLES.glass + " p-8 flex flex-col md:flex-row items-center justify-between gap-8 group"}>
          
              <div className="flex items-center gap-6">
                 <div className="relative">
                    <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full scale-150 group-hover:bg-primary/60 transition-all duration-700" />
                    <div className="relative h-20 w-20 rounded-3xl bg-black/40 border-2 border-primary/50 flex items-center justify-center text-4xl font-black text-white shadow-2xl">
                       {userRank || '?'}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">رتبتك الحالية في المملكة</p>
                    <h2 className="text-3xl font-black text-white">أنت المصنف <span className="text-primary">#{userRank || '?'}</span></h2>
                 </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
                 <div className="text-center">
                    <p className="text-white font-black text-2xl">{userProgress.totalXP.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">مجموع نقاط XP</p>
                 </div>
                 <div className="text-center">
                    <p className="text-white font-black text-2xl">{userProgress.longestStreak}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">أطول سلسلة أيام</p>
                 </div>
                 <Button className="h-14 px-10 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
                    تحدي أصدقائك
                 </Button>
              </div>
           </motion.div>
        }

        {/* --- Leaderboard List: Scroll of Rankings --- */}
        <div className="space-y-8">
           <div className="flex items-center justify-between gap-6 border-b border-white/5 pb-8">
              <div className="flex items-center gap-4">
                 <button
                onClick={() => setLeaderboardType('global')}
                className={`h-12 px-8 flex items-center gap-3 font-black transition-all rounded-2xl ${leaderboardType === 'global' ? 'bg-primary text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
                
                    <Users className="w-5 h-5" />
                    <span>المملكة بأكملها</span>
                 </button>
                 <button
                onClick={() => setLeaderboardType('friends')}
                className={`h-12 px-8 flex items-center gap-3 font-black transition-all rounded-2xl ${leaderboardType === 'friends' ? 'bg-primary text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
                
                    <Sparkles className="w-5 h-5" />
                    <span>كتيبة الرفاق</span>
                 </button>
              </div>
              <div className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                 <Clock className="w-4 h-4 text-primary" />
                 <span>تحديث تلقائي: فوري</span>
              </div>
           </div>

           <div className={STYLES.glass + " p-0 overflow-hidden"}>
              <div className="divide-y divide-white/5">
                 {others.length === 0 && safeLeaderboard.length < 4 ?
              <div className="p-20 text-center space-y-4">
                       <Zap className="w-16 h-16 text-gray-800 mx-auto" />
                       <p className="text-gray-500 font-black uppercase tracking-widest">لا يوجد محاربون آخرون في القاعة حالياً</p>
                    </div> :

              others.map((entry, idx) =>
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-6 flex items-center justify-between hover:bg-white/[0.03] transition-all group ${entry.userId === userId ? 'bg-primary/10' : ''}`}>
                
                          <div className="flex items-center gap-8">
                             <span className="w-12 text-2xl font-black text-gray-700 group-hover:text-primary transition-colors text-center">{entry.rank}</span>
                             <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-white group-hover:scale-110 group-hover:rotate-6 transition-all">
                                {entry.username.charAt(0).toUpperCase()}
                             </div>
                             <div className="space-y-1">
                                <p className="font-black text-lg text-white group-hover:text-primary transition-colors">
                                   {entry.username}
                                   {entry.userId === userId && <Badge className="mr-3 bg-primary text-[10px] font-black h-5 uppercase">أنت</Badge>}
                                </p>
                                <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                                   <span className="uppercase tracking-widest text-primary/70">المستوى {entry.level}</span>
                                   <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
                                      <div className="h-full bg-primary/40 w-[65%]" />
                                   </div>
                                </div>
                             </div>
                          </div>
                          <div className="text-left">
                             <p className="text-2xl font-black text-white">{entry.totalXP.toLocaleString()}</p>
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">XP عسكري</p>
                          </div>
                       </motion.div>
              )
              }
              </div>
           </div>
        </div>

        {/* --- Summary Boxes --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 pb-20">
            {[
          { label: "المحاربون المسجلون", val: safeLeaderboard.length, icon: Users, color: "text-blue-400" },
          { label: "أعلى نقاط مسجلة", val: safeLeaderboard.length > 0 ? Math.max(...safeLeaderboard.map((l) => l.totalXP)).toLocaleString() : '0', icon: Crown, color: "text-amber-400" },
          { label: "ساعات التفوق", val: userProgress ? Math.floor(userProgress.totalStudyTime / 60) : 0, icon: Clock, color: "text-purple-400" }].
          map((stat, i) =>
          <div key={i} className={STYLES.glass + " p-6 flex items-center gap-6 group hover:translate-y-[-5px] transition-all"}>
                 <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 ${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-white">{stat.val}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
                 </div>
              </div>
          )}
        </div>
      </div>

      <AchievementToast
        achievement={currentAchievement}
        onClose={clearAchievementNotification} />
      
    </div>);

}
