import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Route, MapPin, Clock } from "lucide-react";

interface ScheduleStatsCardProps {
  todayJobCount: number;
  todayRevenue: number;
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  nextJob: {
    time: string;
    client_name: string;
    service_type: string;
    price: number;
    address: string;
  } | null;
  onViewRoute?: () => void;
}

export function ScheduleStatsCard({
  todayJobCount,
  todayRevenue,
  completedCount,
  totalCount,
  progressPercentage,
  nextJob,
  onViewRoute
}: ScheduleStatsCardProps) {
  return (
    <div className="space-y-4">
      {/* Daily Stats Header */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">Today</p>
            <h3 className="text-2xl font-bold">
              {todayJobCount} {todayJobCount === 1 ? 'job' : 'jobs'} • ${todayRevenue}
            </h3>
          </div>
          {todayJobCount >= 2 && onViewRoute && (
            <Button variant="outline" size="sm" onClick={onViewRoute}>
              <Route className="h-4 w-4 mr-2" />
              View Route
            </Button>
          )}
        </div>
      </Card>

      {/* Next Job Quick View */}
      {nextJob && (
        <Card className="p-3 border-l-4 border-l-primary">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-semibold tracking-wide">NEXT UP</p>
              <p className="font-semibold text-lg mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {nextJob.time} — {nextJob.client_name}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {nextJob.service_type} • ${nextJob.price}
              </p>
              {nextJob.address && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {nextJob.address}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Today's Progress */}
      {totalCount > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Today's Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} completed
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </Card>
      )}
    </div>
  );
}
