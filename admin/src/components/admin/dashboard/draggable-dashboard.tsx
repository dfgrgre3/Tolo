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

const EMPTY_ARRAY: any[] = [];
const STORAGE_KEY = "admin-dashboard-layout";

export function DraggableDashboard({ children: initialChildren, onOrderChange, ...props }: DraggableDashboardProps & { sections?: any }) {
  const children = initialChildren || (props as any).sections || EMPTY_ARRAY;
  const { playSound } = usePremiumSounds();

  // Load saved layout from localStorage on mount
  const [items, setItems] = React.useState<string[]>(() => {
    const defaultOrder = children.map((c: any) => String(c.id));

    if (typeof window === "undefined") return defaultOrder;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedOrder = JSON.parse(saved) as string[];
        // Validate saved order matches current children
        const currentIds = new Set(defaultOrder);
        const validSavedOrder = savedOrder.filter((id) => currentIds.has(id));
        // Add any new children not in saved order
        const newIds = defaultOrder.filter((id) => !savedOrder.includes(id));
        return [...validSavedOrder, ...newIds];
      }
    } catch {
      // Ignore localStorage errors
    }
    return defaultOrder;
  });

  // Save layout to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore localStorage errors
    }
  }, [items]);

  React.useEffect(() => {
    const newIds = children.map((c: any) => c.id);
    const currentIds = items;
    
    // Only update if IDs have actually changed (simple equality check for contents)
    if (newIds.length !== currentIds.length || newIds.some((id, i) => id !== currentIds[i])) {
      setItems(newIds);
    }
  }, [initialChildren, (props as any).sections]);

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
      setItems((currentItems) => {
        const oldIndex = currentItems.indexOf(active.id as string);
        const newIndex = currentItems.indexOf(over?.id as string);
        const newLayout = arrayMove(currentItems, oldIndex, newIndex);
        onOrderChange?.(newLayout);
        return newLayout;
      });
    } else {
      playSound('close');
    }
  };

  // Reset layout to default order
  const resetLayout = React.useCallback(() => {
    const defaultOrder = children.map((c: any) => String(c.id));
    setItems(defaultOrder);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [children]);

  const orderedContents = items.map(id => children.find(c => c.id === id)).filter(Boolean);

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={resetLayout}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="إعادة ترتيب الأقسام للوضع الافتراضي"
        >
          إعادة الترتيب الافتراضي
        </button>
      </div>
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
    </>
  );
}
