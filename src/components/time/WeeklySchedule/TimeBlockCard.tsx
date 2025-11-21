import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeRange, getBlockDuration } from './utils';
import { BLOCK_TYPES, PRIORITY_COLORS } from './constants';
import type { TimeBlock } from './types';
import styles from './styles.module.css';

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
  
  const blockHeight = Math.max(duration / 60 * 60, 20);
  const blockStyle: React.CSSProperties & { '--block-color'?: string; '--block-height': string } = {
    '--block-height': `${blockHeight}px`
  };
  if (block.color) {
    blockStyle['--block-color'] = block.color;
  }

  return (
    // CSS variables for dynamic values are acceptable
    <div
      className={cn(
        styles.blockCard,
        styles.blockCardHeight,
        typeInfo.color,
        "text-white",
        PRIORITY_COLORS[block.priority || 'MEDIUM'],
        block.isCompleted && "opacity-60 line-through",
        block.color && styles.blockCardWithColor
      )}
      style={blockStyle}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(block);
      }}
      draggable
      onDragStart={() => onDragStart(block)}
    >
      <div className="font-medium truncate">{block.title}</div>
      {!compactView && (
        <>
          <div className="text-xs opacity-90">
            {formatTimeRange(block.startTime, block.endTime)}
          </div>
          {block.subject && (
            <div className="text-xs opacity-80 truncate">
              {block.subject}
            </div>
          )}
        </>
      )}
      
      <div className="absolute top-1 left-1 opacity-0 hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete(block.id);
            }}
            className="w-4 h-4 bg-white/20 rounded hover:bg-white/40"
          >
            {block.isCompleted ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <Circle className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

