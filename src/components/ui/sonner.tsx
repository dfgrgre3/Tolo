
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
          background: 'var(--background)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        }
      }}
    />
  )
}
