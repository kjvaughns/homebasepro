import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle2, FileText } from "lucide-react";
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

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      const { data, error } = await supabase
        .from("service_calls")
        .select(`
          *,
          service_requests(service_type, property_details),
          homeowner:profiles!service_calls_homeowner_id_fkey(full_name, phone)
        `)
        .eq("provider_org_id", org.id)
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
      <div className="container max-w-6xl py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Service Calls</h1>
        <p className="text-muted-foreground">Diagnostic appointments and service visits</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {serviceCalls.filter((sc) => sc.status === "scheduled").length}
                </p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {serviceCalls.filter((sc) => sc.status === "in_progress").length}
                </p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {serviceCalls.filter((sc) => sc.status === "completed").length}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Calls List */}
      <div className="space-y-4">
        {serviceCalls.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No service calls scheduled</h3>
              <p className="text-sm text-muted-foreground">
                Service calls will appear here when customers book diagnostics
              </p>
            </CardContent>
          </Card>
        ) : (
          serviceCalls.map((serviceCall) => (
            <Card
              key={serviceCall.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/provider/jobs`)} // Will link to detail view later
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">
                        {serviceCall.service_requests?.service_type || "Diagnostic Visit"}
                      </h3>
                      <Badge className={getStatusColor(serviceCall.status)}>
                        {serviceCall.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {serviceCall.homeowner?.full_name} • {serviceCall.homeowner?.phone}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(serviceCall.scheduled_date).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    {serviceCall.status === "scheduled" && (
                      <Button size="sm">Start Diagnostic</Button>
                    )}
                    {serviceCall.status === "completed" && (
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-1" />
                        View Results
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
