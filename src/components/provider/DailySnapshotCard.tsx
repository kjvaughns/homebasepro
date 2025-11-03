import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, CloudSun, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DailySnapshotCardProps {
  todayJobs: number;
  unpaidInvoices: number;
  weather?: {
    temp: number;
    condition: string;
  };
  onOptimizeRoute?: () => void;
}

export function DailySnapshotCard({ 
  todayJobs, 
  unpaidInvoices, 
  weather,
  onOptimizeRoute 
}: DailySnapshotCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span>Today's Snapshot</span>
          <Badge variant="outline" className="text-xs">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Today's Jobs */}
          <button
            onClick={() => navigate('/provider/jobs?filter=today')}
            className="flex flex-col gap-2 p-3 rounded-xl bg-background/50 border border-border/50 hover:bg-accent/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Today's Jobs</span>
            </div>
            <span className="text-2xl font-bold">{todayJobs}</span>
          </button>

          {/* Unpaid Invoices */}
          <button
            onClick={() => navigate('/provider/accounting?status=unpaid')}
            className="flex flex-col gap-2 p-3 rounded-xl bg-background/50 border border-border/50 hover:bg-accent/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Unpaid</span>
            </div>
            <span className="text-2xl font-bold">{unpaidInvoices}</span>
          </button>
        </div>

        {/* Weather */}
        {weather && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
            <div className="flex items-center gap-2">
              <CloudSun className="h-4 w-4 text-primary" />
              <span className="text-sm">Weather Today</span>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{weather.temp}°F</p>
              <p className="text-xs text-muted-foreground">{weather.condition}</p>
            </div>
          </div>
        )}

        {/* Optimize Route */}
        {todayJobs > 1 && (
          <Button
            onClick={onOptimizeRoute}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Optimize Today's Route
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
