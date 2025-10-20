import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, CheckCircle, Edit } from "lucide-react";
import { format } from "date-fns";

interface JobCardProps {
  job: {
    id: string;
    service_name: string;
    address: string;
    date_time_start: string;
    date_time_end: string;
    status: string;
    clients?: {
      name: string;
    };
  };
  onComplete?: (id: string) => void;
  onReschedule?: (id: string) => void;
  onAddNotes?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export const JobCard = ({ job, onComplete, onReschedule, onAddNotes }: JobCardProps) => {
  const startTime = new Date(job.date_time_start);
  const endTime = new Date(job.date_time_end);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{job.service_name}</CardTitle>
            {job.clients && (
              <p className="text-sm text-muted-foreground">{job.clients.name}</p>
            )}
          </div>
          <Badge className={statusColors[job.status] || statusColors.pending} variant="secondary">
            {job.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span>{job.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(startTime, 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </span>
          </div>
        </div>

        {job.status !== 'completed' && job.status !== 'cancelled' && (
          <div className="flex gap-2 pt-2">
            {onComplete && (
              <Button size="sm" onClick={() => onComplete(job.id)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
            {onReschedule && (
              <Button size="sm" variant="outline" onClick={() => onReschedule(job.id)}>
                <Calendar className="h-4 w-4 mr-1" />
                Reschedule
              </Button>
            )}
            {onAddNotes && (
              <Button size="sm" variant="ghost" onClick={() => onAddNotes(job.id)}>
                <Edit className="h-4 w-4 mr-1" />
                Notes
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
