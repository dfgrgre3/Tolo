"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/providers/theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle({ isDarkMode, onToggle }: { isDarkMode?: boolean; onToggle?: () => void } = {}) {
  const { setTheme, theme } = useTheme()
 
  const handleToggle = () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    
    if (onToggle) {
      onToggle()
    } else {
      setTheme(nextTheme)
    }
  }

  const isDark = isDarkMode !== undefined ? isDarkMode : theme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
    >
      {isDark ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">تبديل المظهر</span>
    </Button>
  )
}
