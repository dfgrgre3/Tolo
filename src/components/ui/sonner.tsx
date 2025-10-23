
"use client"

import { Toaster } from "sonner"

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        className: 'rtl:right-auto rtl:left-0',
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
        }
      }}
    />
  )
}
