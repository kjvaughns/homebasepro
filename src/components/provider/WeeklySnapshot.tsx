import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Briefcase, DollarSign, Clock } from "lucide-react";

interface WeeklySnapshotProps {
  jobCount: number;
  completedCount: number;
  earned: number;
  pending: number;
}

export function WeeklySnapshot({ jobCount, completedCount, earned, pending }: WeeklySnapshotProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          This Week's Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3" />
              <span>Jobs</span>
            </div>
            <div className="text-2xl font-bold">{jobCount}</div>
            {completedCount > 0 && (
              <div className="text-xs text-muted-foreground">
                {completedCount} completed
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>Earned</span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(earned)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Pending</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(pending)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Completion</div>
            <div className="text-2xl font-bold">
              {jobCount > 0 ? Math.round((completedCount / jobCount) * 100) : 0}%
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${jobCount > 0 ? (completedCount / jobCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
