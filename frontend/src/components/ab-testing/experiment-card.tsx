import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, Search } from "lucide-react";
import { m } from "framer-motion";
import { Experiment } from "@/types/ab-testing";

interface ExperimentCardProps {
  experiment: Experiment;
  onToggleStatus: (id: string, newStatus: "active" | "paused" | "completed") => void;
  onDeclareWinner: (id: string, winner: "A" | "B") => void;
}

export const ExperimentCard: React.FC<ExperimentCardProps> = ({ 
  experiment, 
  onToggleStatus, 
  onDeclareWinner 
}) => {
  const maxViews = Math.max(experiment.variantA.views, experiment.variantB.views);

  return (
    <m.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className={`p-0 overflow-hidden border-2 bg-card/50 backdrop-blur-sm ${experiment.status === 'active' ? 'border-primary shadow-[0_4px_30px_rgba(var(--primary),0.1)]' : 'border-border/50 opacity-80'}`}>
        {/* Header */}
        <div className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${experiment.status === 'active' ? 'bg-primary/5' : 'bg-muted/30'}`}>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <Badge variant={experiment.status === 'active' ? 'default' : 'secondary'}>
                {experiment.status === 'active' ? 'نشط' : experiment.status === 'paused' ? 'موقوف مؤقتاً' : 'مكتمل'}
              </Badge>
              <span className="text-xs text-muted-foreground font-bold tracking-widest uppercase">
               _started in {experiment.startDate}
              </span>
              {experiment.endDate && (
                <span className="text-xs text-muted-foreground font-bold tracking-widest uppercase">
                  ended {experiment.endDate}
                </span>
              )}
            </div>
            <h4 className="text-lg font-black">{experiment.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{experiment.description}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">تم إنشاؤها بواسطة: {experiment.createdBy}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">حجم العينة: {experiment.sampleSize.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {experiment.status === 'active' ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="font-bold border-amber-500/50 hover:bg-amber-500/10 text-amber-500 gap-2"
                  onClick={() => onToggleStatus(experiment.id, 'paused')}
                >
                  <Pause className="w-4 h-4" /> إيقاف مؤقت
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="font-bold bg-foreground text-background"
                  onClick={() => onDeclareWinner(experiment.id, 'A')}
                >
                  إعلان الفائز (A)
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="font-bold bg-foreground text-background"
                  onClick={() => onDeclareWinner(experiment.id, 'B')}
                >
                  إعلان الفائز (B)
                </Button>
              </>
            ) : experiment.status === 'paused' ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="font-bold border-green-500/50 hover:bg-green-500/10 text-green-500 gap-2"
                  onClick={() => onToggleStatus(experiment.id, 'active')}
                >
                  <Play className="w-4 h-4" /> استئناف
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="font-bold bg-foreground text-background"
                  onClick={() => onDeclareWinner(experiment.id, 'A')}
                >
                  إعلان الفائز (A)
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="font-bold bg-foreground text-background"
                  onClick={() => onDeclareWinner(experiment.id, 'B')}
                >
                  إعلان الفائز (B)
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="font-bold gap-2">
                <Search className="w-4 h-4" /> تقرير تفصيلي
              </Button>
            )}
          </div>
        </div>

        {/* Analytics Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/50 border-t border-border/50">
          
          {/* Variant A */}
          <div className={`p-8 relative ${experiment.winner === "A" ? 'bg-emerald-500/5' : ''}`}>
            {experiment.winner === "A" && (
              <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest shadow-lg">
                الفائز بالاستيعاب! (Winner)
              </div>
            )}
            <div className="flex items-center gap-3 text-muted-foreground mb-6">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-500/20 text-slate-500 font-black flex items-center justify-center text-sm border-2 border-slate-500/30">A</span>
              <h5 className="font-bold text-foreground text-base leading-tight">النسخة (أ): {experiment.variantA.name}</h5>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                  <span>عدد القراءات/المشاهدات (Traffic)</span>
                  <span>{experiment.variantA.views} مُسجل</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="bg-slate-500 h-full rounded-full" style={{ width: `${(experiment.variantA.views / maxViews) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                  <span>معدل الإكمال والنهاية (Completion Rate)</span>
                  <span className={experiment.variantA.completionRate > 60 ? 'text-emerald-500' : 'text-orange-500'}>{experiment.variantA.completionRate}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${experiment.variantA.completionRate > 60 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${experiment.variantA.completionRate}%` }}></div>
                </div>
              </div>
              
              {experiment.variantA.avgScore !== undefined && (
                <div className="pt-4 border-t border-dashed flex justify-between items-center bg-background/50 p-2 rounded-lg">
                  <span className="text-xs font-bold text-muted-foreground">متوسط درجات الطلاب</span>
                  <span className="font-black text-lg">{experiment.variantA.avgScore}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Variant B */}
          <div className={`p-8 relative ${experiment.winner === "B" ? 'bg-emerald-500/5' : ''}`}>
            {experiment.winner === "B" && (
              <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest shadow-lg">
                الفائز بالاستيعاب! (Winner)
              </div>
            )}
            <div className="flex items-center gap-3 text-muted-foreground mb-6">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500/20 text-teal-500 font-black flex items-center justify-center text-sm border-2 border-teal-500/30">B</span>
              <h5 className="font-bold text-foreground text-base leading-tight">النسخة (ب): {experiment.variantB.name}</h5>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                  <span>عدد القراءات/المشاهدات (Traffic)</span>
                  <span>{experiment.variantB.views} مُسجل</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(experiment.variantB.views / maxViews) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                  <span>معدل الإكمال والنهاية (Completion Rate)</span>
                  <span className={experiment.variantB.completionRate > 60 ? 'text-emerald-500' : 'text-orange-500'}>{experiment.variantB.completionRate}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${experiment.variantB.completionRate > 60 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${experiment.variantB.completionRate}%` }}></div>
                </div>
              </div>

              {experiment.variantB.avgScore !== undefined && (
                <div className="pt-4 border-t border-dashed flex justify-between items-center bg-background/50 p-2 rounded-lg">
                  <span className="text-xs font-bold text-muted-foreground">متوسط درجات الطلاب</span>
                  <span className="font-black text-lg">{experiment.variantB.avgScore}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </m.div>
  );
};
