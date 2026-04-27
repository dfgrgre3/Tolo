"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { m } from "framer-motion";
import { usePremiumSounds } from "@/hooks/use-premium-sounds";

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
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
    zIndex: isDragging ? 50 : "auto",
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div 
        {...attributes} 
        {...listeners}
        className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity text-muted-foreground hover:text-primary z-20 hidden xl:block"
      >
        <GripVertical className="w-6 h-6" />
      </div>
      <m.div
        animate={{ 
          scale: isDragging ? 1.02 : 1,
          boxShadow: isDragging ? "0 20px 50px rgba(0,0,0,0.2)" : "0 0 0 rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </m.div>
    </div>
  );
}

interface DraggableDashboardProps {
  children: Array<{ id: string; content: React.ReactNode }>;
  onOrderChange?: (newOrder: string[]) => void;
}

export function DraggableDashboard({ children, onOrderChange }: DraggableDashboardProps) {
  const [items, setItems] = React.useState(children.map(c => c.id));
  const { playSound } = usePremiumSounds();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = () => {
    playSound('open');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      playSound('transition');
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);
        const newLayout = arrayMove(items, oldIndex, newIndex);
        onOrderChange?.(newLayout);
        return newLayout;
      });
    } else {
      playSound('close');
    }
  };

  const orderedContents = items.map(id => children.find(c => c.id === id)).filter(Boolean);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-12">
          {orderedContents.map((item) => (
            <SortableItem key={item!.id} id={item!.id}>
              {item!.content}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
