import * as React from "react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "active" | "inactive" | "completed" | "paused" | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let label = status;
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let className = "";

  if (status === "active") {
    label = "نشط";
    className = "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent";
  } else if (status === "paused") {
    label = "موقوف مؤقتاً";
    className = "bg-amber-500 hover:bg-amber-600 text-white border-transparent";
  } else if (status === "completed") {
    label = "مكتمل";
    className = "bg-blue-500 hover:bg-blue-600 text-white border-transparent";
  } else {
    label = "غير نشط";
    variant = "secondary";
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
};
