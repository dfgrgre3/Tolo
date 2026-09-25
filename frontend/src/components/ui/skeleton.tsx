import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/60 select-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
