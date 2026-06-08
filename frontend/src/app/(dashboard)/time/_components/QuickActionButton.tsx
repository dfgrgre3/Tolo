'use client';

import React, { useState } from 'react';
import { m, AnimatePresence } from "framer-motion";
import { Plus, CheckSquare, Bell, Timer, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickActionButtonProps {
  onAction: (type: 'task' | 'reminder' | 'timer') => void;
}

const QuickActionButton = ({ onAction }: QuickActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { id: 'task', icon: <CheckSquare className="h-5 w-5" />, label: 'مهمة جديدة', color: 'bg-blue-500', hover: 'hover:bg-blue-600' },
    { id: 'reminder', icon: <Bell className="h-5 w-5" />, label: 'تذكير جديد', color: 'bg-rose-500', hover: 'hover:bg-rose-600' },
    { id: 'timer', icon: <Timer className="h-5 w-5" />, label: 'بدء مؤقت', color: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <div className="relative flex flex-col items-center gap-4">
        <AnimatePresence>
          {isOpen && (
            <m.div 
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="flex flex-col items-center gap-3 mb-2"
            >
              {actions.map((action, idx) => (
                <TooltipProvider key={action.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <m.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => {
                          onAction(action.id as any);
                          setIsOpen(false);
                        }}
                        className={`w-12 h-12 rounded-full ${action.color} ${action.hover} text-white shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95`}
                      >
                        {action.icon}
                      </m.button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="font-bold">
                      {action.label}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </m.div>
          )}
        </AnimatePresence>

        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-500 ${
            isOpen ? 'bg-slate-800 rotate-90' : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>
      </div>
    </div>
  );
};

export default QuickActionButton;
