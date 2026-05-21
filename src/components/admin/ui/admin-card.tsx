import * as React from "react";
import { Card } from "@/components/ui/card";

interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass";
}

export const AdminCard = React.forwardRef<HTMLDivElement, AdminCardProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={className}
        {...props}
      />
    );
  }
);
AdminCard.displayName = "AdminCard";
