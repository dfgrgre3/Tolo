'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckSquare,
  Settings,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const quickLinks = [
  {
    title: 'Track Progress',
    description: 'See your current performance and weekly metrics.',
    href: '/progress',
    icon: BarChart3,
  },
  {
    title: 'Plan Schedule',
    description: 'Review your tasks, events, and study sessions.',
    href: '/schedule',
    icon: CalendarDays,
  },
  {
    title: 'Manage Tasks',
    description: 'Stay on top of your assignments and priorities.',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    title: 'Achievements',
    description: 'Check goals, milestones, and leaderboard status.',
    href: '/achievements',
    icon: Trophy,
  },
  {
    title: 'Profile',
    description: 'Update your personal and account information.',
    href: '/profile',
    icon: User,
  },
  {
    title: 'Settings',
    description: 'Control notifications, security, and preferences.',
    href: '/settings',
    icon: Settings,
  },
];

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  const displayName =
    user?.name || user?.username || user?.email?.split('@')[0] || 'Learner';

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-blue-950/60 p-8 text-white shadow-xl"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-300">
          <Sparkles className="h-3.5 w-3.5" />
          Dashboard
        </div>
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Welcome back, {displayName}</h1>
        <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
          Your account is ready. Use the shortcuts below to continue where you left off.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link, index) => {
          const Icon = link.icon;
          return (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * index }}
            >
              <Card className="h-full border-border/60 bg-background/80 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/40">
                <CardHeader>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="secondary" className="w-full justify-between">
                    <Link href={link.href}>
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
