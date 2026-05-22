import { m } from "framer-motion";
import { cn } from '@/lib/utils';

export function StatBadge({
  icon: Icon,
  value,
  label,
  color
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <m.div
      whileHover={{ scale: 1.05 }}
      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors cursor-default"
    >
      <div className={cn('flex items-center justify-center gap-1.5', color)}>
        <Icon className="h-4 w-4" />
        <span className="text-lg font-black">{value}</span>
      </div>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</span>
    </m.div>
  );
}
