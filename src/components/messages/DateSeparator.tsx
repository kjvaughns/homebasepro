import { format, isToday, isYesterday, isThisYear } from "date-fns";

interface DateSeparatorProps {
  date: Date;
}

export const DateSeparator = ({ date }: DateSeparatorProps) => {
  const formatDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isThisYear(date)) return format(date, "MMMM d");
    return format(date, "MMMM d, yyyy");
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted px-3 py-1 rounded-full">
        <span className="text-xs font-medium text-muted-foreground">
          {formatDate(date)}
        </span>
      </div>
    </div>
  );
};
