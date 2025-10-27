import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  className?: string;
}

export function DateTimePicker({ date, onDateChange, className }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date);
  const [hour, setHour] = useState(date ? date.getHours() : 9);
  const [minute, setMinute] = useState(date ? date.getMinutes() : 0);
  const [period, setPeriod] = useState<"AM" | "PM">(
    date ? (date.getHours() >= 12 ? "PM" : "AM") : "AM"
  );

  const updateDateTime = (newDate?: Date, newHour?: number, newMinute?: number, newPeriod?: "AM" | "PM") => {
    const d = newDate || selectedDate || new Date();
    const h = newHour !== undefined ? newHour : hour;
    const m = newMinute !== undefined ? newMinute : minute;
    const p = newPeriod || period;

    const hours24 = p === "PM" && h !== 12 ? h + 12 : h === 12 && p === "AM" ? 0 : h;
    
    const result = new Date(d);
    result.setHours(hours24, m, 0, 0);
    
    setSelectedDate(result);
    onDateChange(result);
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      updateDateTime(newDate);
    }
  };

  const handleHourChange = (value: string) => {
    const newHour = parseInt(value);
    setHour(newHour);
    updateDateTime(undefined, newHour);
  };

  const handleMinuteChange = (value: string) => {
    const newMinute = parseInt(value);
    setMinute(newMinute);
    updateDateTime(undefined, undefined, newMinute);
  };

  const handlePeriodChange = (value: "AM" | "PM") => {
    setPeriod(value);
    updateDateTime(undefined, undefined, undefined, value);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "flex-1 justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className="pointer-events-auto"
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[140px] justify-start">
            <Clock className="mr-2 h-4 w-4" />
            {hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:{minute.toString().padStart(2, "0")} {period}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 pointer-events-auto" align="start">
          <div className="flex items-center gap-2">
            <Select value={hour.toString()} onValueChange={handleHourChange}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <SelectItem key={h} value={h.toString()}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-lg">:</span>
            <Select value={minute.toString()} onValueChange={handleMinuteChange}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 15, 30, 45].map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {m.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
