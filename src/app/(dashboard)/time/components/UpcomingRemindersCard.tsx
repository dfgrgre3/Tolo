'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Eye, EyeOff } from 'lucide-react';
import { motion } from "framer-motion";
import type { Reminder } from '../types';

interface UpcomingRemindersCardProps {
  reminders: Reminder[];
  showUpcomingOnly: boolean;
  onToggleView: () => void;
  onTabChange: (tab: string) => void;
}

export default function UpcomingRemindersCard({
  reminders,
  showUpcomingOnly,
  onToggleView,
  onTabChange
}: UpcomingRemindersCardProps) {
  return (
    <Card className="border-white/10 shadow-xl bg-background/60 backdrop-blur-xl relative overflow-hidden h-full">
      <CardHeader className="flex flex-row justify-between items-center bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 relative z-10 border-b border-primary/10">
        <CardTitle className="flex items-center text-lg">
          <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 ml-2 shadow-[0_0_10px_rgba(var(--primary),0.2)]">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          التذكيرات القادمة
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onToggleView}
          className="hover:bg-primary/10 transition-colors"
        >
          {showUpcomingOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="p-4 relative z-10">
        <motion.div 
          className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {reminders
            .filter(reminder => {
              if (!showUpcomingOnly) return true;
              return new Date(reminder.remindAt) > new Date();
            })
            .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime())
            .slice(0, 5)
            .map((reminder) => {
              const isUpcoming = new Date(reminder.remindAt) > new Date();
              return (
                <motion.div 
                  key={reminder.id} 
                  variants={{
                    hidden: { x: 20, opacity: 0 },
                    visible: { x: 0, opacity: 1 }
                  }}
                  whileHover={{ scale: 1.02 }}
                  className="group flex items-center justify-between p-4 bg-background/50 backdrop-blur-sm rounded-xl cursor-pointer transition-all duration-300 border border-white/5 hover:border-yellow-500/30 hover:shadow-[0_0_15px_rgba(234,179,8,0.15)] relative overflow-hidden"
                  onClick={() => onTabChange("reminders")}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex-1 relative z-10">
                    <p className="font-semibold text-base mb-1 group-hover:text-yellow-500 transition-colors">{reminder.title}</p>
                    {reminder.message && (
                      <p className="text-sm text-muted-foreground mb-1 line-clamp-1">{reminder.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium mt-1">
                      <span className="text-yellow-500/70">âڈ°</span>
                      {new Date(reminder.remindAt).toLocaleString('ar-EG', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge 
                    variant={isUpcoming ? "default" : "outline"}
                    className={`font-medium tracking-wide relative z-10 ${
                      isUpcoming ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : ''
                    }`}
                  >
                    {isUpcoming ? 'مهمة قادمة' : 'منتهي'}
                  </Badge>
                </motion.div>
              );
            })}
          {reminders
            .filter(reminder => {
              if (!showUpcomingOnly) return true;
              return new Date(reminder.remindAt) > new Date();
            }).length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-10 flex flex-col items-center"
            >
              <div className="mb-4 text-5xl opacity-50 grayscale">ًں””</div>
              <p className="text-muted-foreground font-semibold text-lg">
                {showUpcomingOnly ? 'لا توجد تذكيرات قادمة' : 'لا يوجد سجل تذكيرات'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {showUpcomingOnly ? 'جميع تذكيراتك استظڈكملت' : 'قم بإنشاء تذكير جديد'}
              </p>
            </motion.div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

