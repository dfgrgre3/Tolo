"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const AvatarContext = React.createContext<{
  status: "loading" | "loaded" | "error"
  setStatus: React.Dispatch<React.SetStateAction<"loading" | "loaded" | "error">>
}>({
  status: "loading",
  setStatus: () => {},
})

const Avatar = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">("loading")

  return (
    <AvatarContext.Provider value={{ status, setStatus }}>
      <span
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  )
})
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, src, ...props }, ref) => {
  const { status, setStatus } = React.useContext(AvatarContext)

  React.useEffect(() => {
    if (src) {
      setStatus("loading")
    } else {
      setStatus("error")
    }
  }, [src, setStatus])

  if (status === "error" || !src) {
    return null
  }

  return (
    <img
      ref={ref}
      src={src}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onLoad={() => setStatus("loaded")}
      onError={() => setStatus("error")}
      {...props}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const { status } = React.useContext(AvatarContext)

  if (status === "loaded") {
    return null
  }

  return (
    <span
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
