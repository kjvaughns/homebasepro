import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export default function ServiceCalls() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [serviceCalls, setServiceCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServiceCalls();
  }, []);

  const loadServiceCalls = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("service_calls")
        .select(`
          *,
          provider:organizations!service_calls_provider_org_id_fkey(name, phone)
        `)
        .eq("homeowner_id", profile.id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      setServiceCalls(data || []);
    } catch (error) {
      console.error("Error loading service calls:", error);
      toast({
        title: "Error",
        description: "Failed to load service calls",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "scheduled":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="container max-w-2xl py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service Calls</h1>
        <p className="text-muted-foreground">Your scheduled diagnostic appointments</p>
      </div>

      {serviceCalls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No service calls scheduled</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Book a diagnostic appointment to get started
            </p>
            <Button onClick={() => navigate("/homeowner/browse")}>
              Browse Providers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {serviceCalls.map((serviceCall) => (
            <Card key={serviceCall.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">
                        {serviceCall.provider?.name}
                      </h3>
                      <Badge className={getStatusColor(serviceCall.status)}>
                        {serviceCall.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Diagnostic Appointment
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {new Date(serviceCall.scheduled_date).toLocaleString()}
                    </div>
                    {serviceCall.status === "completed" && serviceCall.diagnosis_summary && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Diagnosis:</p>
                        <p className="text-sm text-muted-foreground">
                          {serviceCall.diagnosis_summary}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {serviceCall.status === "completed" && (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
