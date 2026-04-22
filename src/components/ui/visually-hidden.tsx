import * as React from "react";

import { cn } from "@/lib/utils";

const VisuallyHidden = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "sr-only pointer-events-none absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
VisuallyHidden.displayName = "VisuallyHidden";

export { VisuallyHidden };
