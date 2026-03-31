import { motion } from 'framer-motion';

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  trackColorClass?: string;
  icon?: React.ReactNode;
  label?: string;
  sublabel?: string;
}

export default function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  colorClass = "text-primary",
  trackColorClass = "text-muted/20",
  icon,
  label,
  sublabel
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeValue = Math.min(Math.max(0, value), max);
  const percent = (safeValue / max) * 100;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div 
        className="relative flex items-center justify-center" 
        style={{ width: size, height: size }}
      >
        {/* Track */}
        <svg
          className="absolute -rotate-90 transform"
          width={size}
          height={size}
        >
          <circle
            className={`fill-transparent ${trackColorClass}`}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress */}
          <motion.circle
            className={`fill-transparent ${colorClass}`}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        
        {/* Center Content */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          {icon && <div className={`mb-1 ${colorClass}`}>{icon}</div>}
          <div className="text-xl font-bold dark:text-white drop-shadow-md">
            {value}{max !== 100 && <span className="text-xs text-muted-foreground mr-1">/ {max}</span>}
            {max === 100 && <span className="text-sm">%</span>}
          </div>
        </div>
      </div>
      
      {/* Labels */}
      {(label || sublabel) && (
        <div className="mt-3 text-center">
          {label && <div className="text-sm font-semibold text-foreground">{label}</div>}
          {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
        </div>
      )}
    </div>
  );
}
