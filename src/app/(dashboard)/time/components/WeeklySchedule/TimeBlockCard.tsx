import { CheckCircle, Circle, MapPin, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeRange, getBlockDuration } from './utils';
import { BLOCK_TYPES, PRIORITY_COLORS } from './constants';
import type { TimeBlock } from './types';
import { motion } from 'framer-motion';

interface TimeBlockCardProps {
  block: TimeBlock;
  compactView: boolean;
  onEdit: (block: TimeBlock) => void;
  onComplete: (blockId: string) => void;
  onDragStart: (block: TimeBlock) => void;
}

const getBlockTypeInfo = (type: string) => {
  return BLOCK_TYPES.find(t => t.value === type) || BLOCK_TYPES[0];
};

export function TimeBlockCard({ 
  block, 
  compactView, 
  onEdit, 
  onComplete, 
  onDragStart 
}: TimeBlockCardProps) {
  const typeInfo = getBlockTypeInfo(block.type);
  const duration = getBlockDuration(block.startTime, block.endTime);
  
  // Base height is 80px per hour in our new TimeGrid
  const blockHeight = Math.max((duration / 60) * 80 - 8, 30);
  
  const style: React.CSSProperties = {
    height: `${blockHeight}px`,
    backgroundColor: block.color ? `${block.color}20` : undefined, // Transparent version of the color
    borderColor: block.color || undefined,
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ y: -2, scale: 1.02 }}
      className={cn(
        "absolute inset-x-1 top-1 z-20 rounded-xl p-2 text-[10px] cursor-pointer border-r-4 transition-all duration-300 shadow-lg backdrop-blur-md group",
        "bg-[#0F172A]/80 border-white/10",
        block.isCompleted && "opacity-40 grayscale"
      )}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(block);
      }}
      draggable
      onDragStart={() => onDragStart(block)}
    >
      {/* Decorative side accent based on priority */}
      <div 
        className={cn(
          "absolute inset-y-0 left-0 w-1 rounded-l-xl",
          block.priority === 'URGENT' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
          block.priority === 'HIGH' ? 'bg-orange-500' :
          block.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-slate-500'
        )}
      />

      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-black text-slate-100 truncate flex-1 uppercase tracking-tight">
            {block.title}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete(block.id);
            }}
            className="shrink-0 hover:scale-110 transition-transform"
          >
            {block.isCompleted ? (
              <CheckCircle className="w-3 h-3 text-emerald-400" />
            ) : (
              <Circle className="w-3 h-3 text-slate-500" />
            )}
          </button>
        </div>

        {!compactView && duration >= 30 && (
          <div className="space-y-1.5 flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5 text-slate-400 font-bold">
              <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px]">
                {formatTimeRange(block.startTime, block.endTime)}
              </span>
            </div>
            
            {block.subject && (
              <div className="flex items-center gap-1 text-emerald-400/80 font-black truncate italic">
                <AlignLeft className="h-2.5 w-2.5" />
                {block.subject}
              </div>
            )}

            {block.location && (
              <div className="flex items-center gap-1 text-blue-400/70 truncate">
                <MapPin className="h-2.5 w-2.5" />
                {block.location}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Glossy Overlay Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-xl" />
    </motion.div>
  );
}
