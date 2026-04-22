
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { saveSettingsPreferences } from "@/app/(dashboard)/settings/preferences-client"
import { logger } from "@/lib/logger"

export function ThemeToggle({ isDarkMode, onToggle }: { isDarkMode?: boolean; onToggle?: () => void } = {}) {
  const { setTheme, theme } = useTheme()
  const { user } = useAuth()
 
  const handleToggle = async () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    
    if (onToggle) {
      onToggle()
    } else {
      setTheme(nextTheme)
      
      if (user?.id) {
        try {
          await saveSettingsPreferences({
            appearance: { theme: nextTheme }
          })
        } catch (error) {
          logger.error("Failed to sync theme preference:", error)
        }
      }
    }
  }

  const isDark = isDarkMode !== undefined ? isDarkMode : theme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
    >
      <Sun className={`h-[1.2rem] w-[1.2rem] transition-all ${isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100"}`} />
      <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${isDark ? "rotate-0 scale-100" : "rotate-90 scale-0"}`} />
      <span className="sr-only">تبديل الم٪ر</span>
    </Button>
  )
}

