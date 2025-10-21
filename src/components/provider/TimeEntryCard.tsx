import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, CheckCircle, XCircle, Edit } from "lucide-react";
import { format } from "date-fns";

interface TimeEntryCardProps {
  entry: {
    id: string;
    clock_in_at: string;
    clock_out_at: string | null;
    break_minutes: number;
    status: string;
    team_members?: {
      full_name: string;
      email: string;
    };
    geo_in_lat?: number;
    geo_in_lng?: number;
  };
  onApprove?: (entryId: string) => void;
  onReject?: (entryId: string) => void;
  onEdit?: (entryId: string) => void;
  showActions?: boolean;
}

export function TimeEntryCard({
  entry,
  onApprove,
  onReject,
  onEdit,
  showActions = true,
}: TimeEntryCardProps) {
  const calculateHours = () => {
    if (!entry.clock_out_at) return "In Progress";
    
    const start = new Date(entry.clock_in_at);
    const end = new Date(entry.clock_out_at);
    const diff = end.getTime() - start.getTime();
    const hours = diff / (1000 * 60 * 60);
    const breakHours = (entry.break_minutes || 0) / 60;
    const netHours = hours - breakHours;
    
    return `${netHours.toFixed(2)} hrs`;
  };

  const getStatusBadge = () => {
    const statusColors = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    
    return (
      <Badge variant={statusColors[entry.status as keyof typeof statusColors] as any}>
        {entry.status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold">{entry.team_members?.full_name || "Unknown"}</h3>
            <p className="text-sm text-muted-foreground">{entry.team_members?.email}</p>
          </div>
          {getStatusBadge()}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Clock In
            </p>
            <p className="font-medium">
              {format(new Date(entry.clock_in_at), "MMM d, h:mm a")}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Clock Out
            </p>
            <p className="font-medium">
              {entry.clock_out_at
                ? format(new Date(entry.clock_out_at), "MMM d, h:mm a")
                : "Not yet"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Break</p>
            <p className="font-medium">{entry.break_minutes || 0} min</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Hours</p>
            <p className="font-medium">{calculateHours()}</p>
          </div>
        </div>

        {(entry.geo_in_lat || entry.geo_in_lng) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
            <MapPin className="h-3 w-3" />
            <span>GPS tracked</span>
          </div>
        )}

        {showActions && entry.status === "pending" && entry.clock_out_at && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit?.(entry.id)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onReject?.(entry.id)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onApprove?.(entry.id)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}