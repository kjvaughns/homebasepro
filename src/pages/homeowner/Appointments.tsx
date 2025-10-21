import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Home, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentReceiptButton } from "@/components/homeowner/AppointmentReceiptButton";

export default function Appointments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [visits, setVisits] = useState<any[]>([]);
  const [homeownerName, setHomeownerName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;
      
      setHomeownerName(profile.full_name || "Customer");

      const { data, error } = await supabase
        .from("service_visits")
        .select(`
          *,
          organizations(name),
          homes(name, address)
        `)
        .eq("homeowner_id", profile.id)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;

      setVisits(data || []);
    } catch (error) {
      console.error("Error loading appointments:", error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const upcomingVisits = visits.filter(
    (v) => new Date(v.scheduled_date) >= new Date() && v.status !== "canceled"
  );

  const pastVisits = visits.filter(
    (v) => new Date(v.scheduled_date) < new Date() || v.status === "completed"
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "default";
      case "in_progress":
        return "secondary";
      case "completed":
        return "outline";
      case "canceled":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const VisitCard = ({ visit }: { visit: any }) => (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/homeowner/appointments/${visit.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{visit.organizations?.name}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <Home className="h-3 w-3 mr-1" />
              {visit.homes?.name}
            </div>
          </div>
          <Badge variant={getStatusColor(visit.status)}>{visit.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center text-sm">
          <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>{new Date(visit.scheduled_date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center text-sm">
          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>
            {new Date(visit.scheduled_date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        {visit.technician_name && (
          <p className="text-sm text-muted-foreground">
            Technician: {visit.technician_name}
          </p>
        )}
        <AppointmentReceiptButton visit={visit} homeownerName={homeownerName} />
      </CardContent>
    </Card>
  );

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">View and manage your service appointments</p>
        </div>
        <Button onClick={() => navigate("/homeowner/browse")}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Service
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingVisits.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastVisits.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingVisits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No upcoming appointments</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Schedule a service to get started
                </p>
                <Button onClick={() => navigate("/homeowner/browse")}>
                  Browse Providers
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingVisits.map((visit) => (
                <VisitCard key={visit.id} visit={visit} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastVisits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No past appointments</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Your completed service history will appear here
                </p>
                <Button onClick={() => navigate("/homeowner/browse")}>
                  Browse Providers
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pastVisits.map((visit) => (
                <VisitCard key={visit.id} visit={visit} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
