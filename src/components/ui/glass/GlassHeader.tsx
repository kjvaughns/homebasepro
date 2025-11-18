import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassHeaderProps {
  children: ReactNode;
  className?: string;
}

export function GlassHeader({ children, className }: GlassHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-2", className)}>
      {children}
    </div>
  );
}
