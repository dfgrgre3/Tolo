'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface SortableSectionProps {
  id: string;
  children: React.ReactNode;
}

export function SortableSection({ id, children }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/section relative">
      <div 
        {...attributes} 
        {...listeners}
        className="absolute -right-1 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover/section:opacity-100 cursor-grab active:cursor-grabbing transition-opacity z-20 bg-black/20 backdrop-blur-md rounded-lg border border-white/10 hidden md:block"
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>
      <motion.div
        animate={{
          scale: isDragging ? 1.02 : 1,
          boxShadow: isDragging ? "0 20px 40px rgba(0,0,0,0.4)" : "none",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
