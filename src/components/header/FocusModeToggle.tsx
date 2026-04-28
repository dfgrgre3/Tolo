"use client";

import React, { memo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Focus, Eye, EyeOff, BellOff, Search, Minimize2, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem } from
"@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useFocusMode } from "@/hooks/use-focus-mode";

interface FocusModeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const FocusModeToggle = memo(function FocusModeToggle({
  className,
  showLabel = false
}: FocusModeToggleProps) {
  const { state, actions, visibilityState: _visibilityState } = useFocusMode();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative transition-all duration-300 group",
            state.isEnabled && "text-primary bg-primary/10",
            className
          )}
          title={state.isEnabled ? "وضع التركيز مفعّل" : "وضع التركيز"}>
          
          <m.div
            animate={{
              scale: state.isEnabled ? [1, 1.1, 1] : 1
            }}
            transition={{
              duration: 0.3,
              ease: "easeInOut"
            }}>
            
            <Focus className="h-4 w-4" />
          </m.div>
          
          {/* Active indicator */}
          <AnimatePresence>
            {state.isEnabled &&
            <m.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />

            }
          </AnimatePresence>

          {showLabel &&
          <span className="mr-2 text-sm">
              {state.isEnabled ? "مركّز" : "تركيز"}
            </span>
          }
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>وضع التركيز</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={actions.toggle}>
            
            {state.isEnabled ?
            <>
                <EyeOff className="h-3 w-3 ml-1" />
                إيقاف
              </> :

            <>
                <Eye className="h-3 w-3 ml-1" />
                تفعيل
              </>
            }
          </Button>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Focus mode options */}
        <DropdownMenuCheckboxItem
          checked={state.hideNotifications}
          onCheckedChange={actions.setHideNotifications}
          disabled={!state.isEnabled}>
          
          <BellOff className="h-4 w-4 ml-2" />
          إخفاء الإشعارات
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={state.hideSearch}
          onCheckedChange={actions.setHideSearch}
          disabled={!state.isEnabled}>
          
          <Search className="h-4 w-4 ml-2" />
          إخفاء البحث
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={state.isMinimal}
          onCheckedChange={actions.setMinimal}
          disabled={!state.isEnabled}>
          
          <Minimize2 className="h-4 w-4 ml-2" />
          وضع الحد الأدنى
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={state.autoHideIdle}
          onCheckedChange={actions.setAutoHideIdle}
          disabled={!state.isEnabled}>
          
          <Clock className="h-4 w-4 ml-2" />
          إخفاء تلقائي عند الخمول
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={actions.reset} className="text-muted-foreground">
          <RotateCcw className="h-4 w-4 ml-2" />
          إعادة تعيين
        </DropdownMenuItem>

        {/* Keyboard shortcut hint */}
        <div className="px-2 py-1.5 text-xs text-muted-foreground text-center border-t mt-1">
          اختصار: <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl+Shift+F</kbd>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>);

});

// Compact focus mode indicator for minimal header
const FocusModeIndicator = memo(function FocusModeIndicator({
  className


}: {className?: string;}) {
  const { state, actions } = useFocusMode();

  if (!state.isEnabled) return null;

  return (
    <m.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium",
        className
      )}>
      
      <Focus className="h-3.5 w-3.5" />
      <span>وضع التركيز</span>
      <button
        onClick={actions.disable}
        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
        title="إيقاف وضع التركيز">
        
        <EyeOff className="h-3 w-3" />
      </button>
    </m.div>);

});

