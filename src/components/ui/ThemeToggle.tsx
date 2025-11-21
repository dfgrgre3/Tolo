
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"

export function ThemeToggle({ isDarkMode, onToggle }: { isDarkMode?: boolean; onToggle?: () => void } = {}) {
  const { setTheme, theme } = useTheme()

  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setTheme(theme === "light" ? "dark" : "light")
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
      <span className="sr-only">تبديل المظهر</span>
    </Button>
  )
}

ThemeToggle.propTypes = {
  isDarkMode: PropTypes.bool,
  onToggle: PropTypes.func,
}
