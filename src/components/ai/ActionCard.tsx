import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  }[];
  className?: string;
  children?: React.ReactNode;
}

export function ActionCard({ 
  title, 
  description, 
  icon: Icon, 
  actions, 
  className,
  children 
}: ActionCardProps) {
  return (
    <Card className={cn(
      "max-w-md transition-all duration-200 hover:shadow-md animate-scale-in",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <CardDescription className="text-sm">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      {children && (
        <CardContent className="pb-3">
          {children}
        </CardContent>
      )}

      {actions && actions.length > 0 && (
        <CardFooter className="flex flex-wrap gap-2 pt-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "default"}
              size="sm"
              onClick={action.onClick}
              className="transition-all duration-200 hover:scale-105"
            >
              {action.label}
            </Button>
          ))}
        </CardFooter>
      )}
    </Card>
  );
}