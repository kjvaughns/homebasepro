import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetricProps {
  label: string;
  value: string | number;
  helper?: string;
}

export function Metric({ label, value, helper }: MetricProps) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {helper && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{helper}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}
