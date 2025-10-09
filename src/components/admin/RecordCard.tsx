import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatColumnName } from "@/constants/tableMetadata";

interface RecordCardProps {
  record: any;
  essentialColumns: string[];
  onClick: () => void;
}

const RecordCard = ({ record, essentialColumns, onClick }: RecordCardProps) => {
  const formatValue = (value: any, columnName: string): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    if (columnName.includes("_at") || columnName.includes("date")) {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return String(value);
      }
    }
    if (columnName.includes("amount") || columnName.includes("price") || columnName.includes("fee")) {
      const num = Number(value);
      if (!isNaN(num)) return `$${(num / 100).toFixed(2)}`;
    }
    return String(value).substring(0, 50);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: "bg-green-500/10 text-green-500",
      pending: "bg-yellow-500/10 text-yellow-500",
      completed: "bg-blue-500/10 text-blue-500",
      canceled: "bg-red-500/10 text-red-500",
      paused: "bg-gray-500/10 text-gray-500",
    };
    return (
      <Badge className={cn("capitalize", statusColors[status] || "")}>
        {status}
      </Badge>
    );
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] transition-transform" 
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        {essentialColumns.slice(0, 4).map((column) => (
          <div key={column} className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
              {formatColumnName(column)}:
            </span>
            <span className="text-sm text-right flex-1">
              {column === "status" 
                ? getStatusBadge(record[column])
                : formatValue(record[column], column)
              }
            </span>
          </div>
        ))}
        <div className="pt-2 border-t">
          <span className="text-xs text-primary font-medium">Tap to view details</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecordCard;
