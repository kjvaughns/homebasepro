import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Calendar,
  User,
  Camera,
  Wrench
} from "lucide-react";
import { format } from "date-fns";

interface ServiceCallStatusProps {
  serviceCallId: string;
}

interface ServiceCall {
  id: string;
  scheduled_date: string;
  completed_at: string | null;
  status: string;
  diagnostic_fee: number;
  fee_paid: boolean;
  technician_notes: string | null;
  diagnosis_summary: string | null;
  photos: any;
  recommended_actions: any;
  generated_quote_id: string | null;
  organizations: {
    name: string;
  };
  team_members: {
    profiles: {
      full_name: string;
    };
  } | null;
}

export function ServiceCallStatus({ serviceCallId }: ServiceCallStatusProps) {
  const navigate = useNavigate();
  const [serviceCall, setServiceCall] = useState<ServiceCall | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServiceCall();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`service-call-${serviceCallId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_calls',
          filter: `id=eq.${serviceCallId}`
        },
        (payload) => {
          loadServiceCall();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceCallId]);

  const loadServiceCall = async () => {
    try {
      const { data, error } = await supabase
        .from("service_calls")
        .select(`
          *,
          organizations (name),
          team_members (
            profiles (full_name)
          )
        `)
        .eq("id", serviceCallId)
        .single();

      if (error) throw error;
      setServiceCall(data);
    } catch (error) {
      console.error("Error loading service call:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { label: "Scheduled", variant: "secondary" as const, icon: Calendar },
      in_progress: { label: "In Progress", variant: "default" as const, icon: Wrench },
      completed: { label: "Completed", variant: "default" as const, icon: CheckCircle2 },
      canceled: { label: "Canceled", variant: "destructive" as const, icon: AlertCircle },
      no_show: { label: "No Show", variant: "destructive" as const, icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return <div>Loading service call details...</div>;
  }

  if (!serviceCall) {
    return <div>Service call not found</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Diagnostic Service Call
              </CardTitle>
              <CardDescription className="mt-1">
                {serviceCall.organizations.name}
              </CardDescription>
            </div>
            {getStatusBadge(serviceCall.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Scheduled:</span>
              <span>{format(new Date(serviceCall.scheduled_date), "PPP 'at' p")}</span>
            </div>

            {serviceCall.team_members?.profiles && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Technician:</span>
                <span>{serviceCall.team_members.profiles.full_name}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Diagnostic Fee:</span>
              <span className="font-bold text-primary">
                ${(serviceCall.diagnostic_fee / 100).toFixed(2)}
              </span>
              {serviceCall.fee_paid && (
                <Badge variant="secondary" className="ml-2">Paid</Badge>
              )}
            </div>
          </div>

          {serviceCall.status === 'scheduled' && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                The technician will arrive at your scheduled time to diagnose the issue. 
                You'll receive updates as they progress through the inspection.
              </p>
            </div>
          )}

          {serviceCall.status === 'in_progress' && (
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
              <p className="text-sm font-medium">🔧 Technician is currently diagnosing your issue...</p>
              <p className="text-sm text-muted-foreground mt-1">
                You'll receive a detailed report and quote once the inspection is complete.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {serviceCall.status === 'completed' && serviceCall.diagnosis_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Diagnosis Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {serviceCall.diagnosis_summary}
              </p>
            </div>

            {serviceCall.technician_notes && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Technician Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {serviceCall.technician_notes}
                  </p>
                </div>
              </>
            )}

            {serviceCall.photos && Array.isArray(serviceCall.photos) && serviceCall.photos.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Photos ({serviceCall.photos.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {serviceCall.photos.map((photo: any, idx: number) => (
                      <img
                        key={idx}
                        src={photo.url}
                        alt={`Diagnostic photo ${idx + 1}`}
                        className="rounded-lg border object-cover aspect-video"
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {serviceCall.recommended_actions && Array.isArray(serviceCall.recommended_actions) && serviceCall.recommended_actions.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Recommended Actions</h4>
                  <ul className="space-y-2">
                    {serviceCall.recommended_actions.map((action: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{action.description || action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {serviceCall.generated_quote_id && (
              <Button
                onClick={() => navigate(`/homeowner/quotes/${serviceCall.generated_quote_id}`)}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Quote
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
