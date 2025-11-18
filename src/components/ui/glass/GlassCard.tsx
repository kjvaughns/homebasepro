import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div 
      className={cn(
        "rounded-2xl backdrop-blur-xl border transition-all duration-300",
        "bg-card/80 border-border/50",
        "shadow-lg hover:shadow-xl",
        "dark:bg-card/60 dark:border-border/30",
        className
      )}
    >
      {children}
    </div>
  );
}
