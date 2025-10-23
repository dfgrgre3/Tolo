// ...existing code...
import React from "react";

export const Separator: React.FC<{ className?: string }> = ({ className }) => (
  <div className={"w-full h-px bg-gray-200 my-2 " + (className || "")}></div>
);
// ...existing code...
