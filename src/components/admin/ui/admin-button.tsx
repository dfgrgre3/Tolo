import * as React from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "premium" | "gradient" | "success" | "warning" | "neon";
  size?: "default" | "sm" | "lg" | "xl" | "icon";
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
}

export const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ className, variant, size, icon: Icon, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant as any}
        size={size as any}
        className={className}
        {...props}
      >
        {Icon && <Icon className="w-4 h-4" />}
        {children}
      </Button>
    );
  }
);
AdminButton.displayName = "AdminButton";
