import { AdminCard } from "@/components/admin/ui/admin-card";
import { TrendingUp, Activity, BarChart3 } from "lucide-react";
import { Experiment } from "@/types/ab-testing";

interface StatsCardsProps {
  experiments: Experiment[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  experiments
}) => {
  const safeExperiments = Array.isArray(experiments) ? experiments : [];
  const totalParticipants = safeExperiments.reduce((sum, exp) => sum + exp.sampleSize, 0);
  const activeExperiments = safeExperiments.filter(e => e.status === 'active').length;

  return (
    <div className="grid gap-6 md:grid-cols-4">
      <AdminCard variant="glass" className="p-6 border-emerald-500/20 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-muted-foreground mb-1">المحاربون المجربون (Traffic)</p>
          <h3 className="text-4xl font-black text-emerald-500">{totalParticipants}</h3>
        </div>
        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
          <UsersIcon className="w-7 h-7" />
        </div>
      </AdminCard>
      <AdminCard variant="glass" className="p-6 border-teal-500/20 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-muted-foreground mb-1">النمو المُضاف من التجارب</p>
          <h3 className="text-4xl font-black text-teal-500">+28%</h3>
        </div>
        <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-500">
          <TrendingUp className="w-7 h-7" />
        </div>
      </AdminCard>
      <AdminCard variant="glass" className="p-6 border-blue-500/20 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-muted-foreground mb-1">تجارب نشطة الآن</p>
          <h3 className="text-4xl font-black text-blue-500">{activeExperiments}</h3>
        </div>
        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
          <Activity className="w-7 h-7" />
        </div>
      </AdminCard>
      <AdminCard variant="glass" className="p-6 border-purple-500/20 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-muted-foreground mb-1">إجمالي التجارب</p>
          <h3 className="text-4xl font-black text-purple-500">{safeExperiments.length}</h3>
        </div>
        <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
          <BarChart3 className="w-7 h-7" />
        </div>
      </AdminCard>
    </div>
  );
};

// Inline fallback since Lucide's Users might be named slightly differently if exported vs destructured, though `Users` is standard.
function UsersIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );
}
