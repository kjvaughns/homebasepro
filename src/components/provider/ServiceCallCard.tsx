import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  MapPin, 
  User, 
  Clock,
  CheckCircle2,
  Wrench,
  FileText
} from "lucide-react";
import { format } from "date-fns";

interface ServiceCallCardProps {
  serviceCall: {
    id: string;
    scheduled_date: string;
    status: string;
    diagnostic_fee: number;
    fee_paid: boolean;
    service_requests?: {
      issue_description: string;
    } | null;
    homes: {
      street_address: string;
      city: string;
      state: string;
    };
    profiles: {
      full_name: string;
      email: string;
    };
    generated_quote_id?: string | null;
  };
  onStatusChange?: () => void;
}

export function ServiceCallCard({ serviceCall, onStatusChange }: ServiceCallCardProps) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: "secondary",
      in_progress: "default",
      completed: "success",
      canceled: "destructive",
      no_show: "destructive"
    };
    return colors[status as keyof typeof colors] || "secondary";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      scheduled: "Scheduled",
      in_progress: "In Progress",
      completed: "Completed",
      canceled: "Canceled",
      no_show: "No Show"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleCardClick = () => {
    navigate(`/provider/service-calls/${serviceCall.id}`);
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4" />
            Diagnostic Service Call
          </CardTitle>
          <Badge variant={getStatusColor(serviceCall.status) as any}>
            {getStatusLabel(serviceCall.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{format(new Date(serviceCall.scheduled_date), "PPP 'at' p")}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{serviceCall.profiles.full_name}</p>
            <p className="text-xs text-muted-foreground">{serviceCall.profiles.email}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span>
            {serviceCall.homes.street_address}, {serviceCall.homes.city}, {serviceCall.homes.state}
          </span>
        </div>

        {serviceCall.service_requests?.issue_description && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs font-medium mb-1">Issue Description:</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {serviceCall.service_requests.issue_description}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Fee:</span>
          <span className="font-bold text-primary">
            ${(serviceCall.diagnostic_fee / 100).toFixed(2)}
          </span>
          {serviceCall.fee_paid && (
            <Badge variant="secondary" className="ml-auto">Paid</Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {serviceCall.status === 'scheduled' && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/provider/service-calls/${serviceCall.id}`);
            }}
          >
            Start Diagnosis
          </Button>
        )}
        
        {serviceCall.status === 'completed' && !serviceCall.generated_quote_id && (
          <Button
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/provider/service-calls/${serviceCall.id}/quote`);
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Create Quote
          </Button>
        )}

        {serviceCall.generated_quote_id && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/provider/quotes/${serviceCall.generated_quote_id}`);
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            View Quote
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
