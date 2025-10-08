import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardFiltersProps {
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onExport: () => void;
}

export const DashboardFilters = ({ onDateRangeChange, onExport }: DashboardFiltersProps) => {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const handleDateSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    onDateRangeChange(range);
  };

  const handleQuickSelect = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    handleDateSelect({ from, to });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => handleQuickSelect(7)}>
          Last 7 days
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickSelect(30)}>
          Last 30 days
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickSelect(90)}>
          Last 90 days
        </Button>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange.from}
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range: any) => handleDateSelect(range || { from: undefined, to: undefined })}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
};
