import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Home, MapPin, User, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { RefundRequestDialog } from "@/components/homeowner/RefundRequestDialog";

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadVisitDetails();
    loadUserProfile();
  }, [id]);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    setUserProfile(profile);
  };

  const loadVisitDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("service_visits")
        .select(`
          *,
          organizations(name, phone, email),
          homes(name, address, city, state, zip_code)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      setVisit(data);
    } catch (error) {
      console.error("Error loading visit:", error);
      toast({
        title: "Error",
        description: "Failed to load appointment details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  if (!visit) {
    return (
      <div className="container max-w-6xl py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Appointment not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/homeowner/appointments")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Appointments
        </Button>
        <Badge variant={getStatusColor(visit.status)}>{visit.status}</Badge>
      </div>

      {/* Appointment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{visit.organizations?.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(visit.scheduled_date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Time</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(visit.scheduled_date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Property</p>
                <p className="text-sm text-muted-foreground">{visit.homes?.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Address</p>
                <p className="text-sm text-muted-foreground">
                  {visit.homes?.address}
                  <br />
                  {visit.homes?.city}, {visit.homes?.state} {visit.homes?.zip_code}
                </p>
              </div>
            </div>
          </div>

          {visit.technician_name && (
            <div className="flex items-start gap-3 pt-4 border-t">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Technician</p>
                <p className="text-sm text-muted-foreground">{visit.technician_name}</p>
              </div>
            </div>
          )}

          {visit.notes && (
            <div className="pt-4 border-t">
              <p className="font-medium mb-2">Notes</p>
              <p className="text-sm text-muted-foreground">{visit.notes}</p>
            </div>
          )}

          {visit.arrival_time && (
            <div className="pt-4 border-t">
              <p className="font-medium mb-2">Service Timeline</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Arrival:</span>
                  <span>
                    {new Date(visit.arrival_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {visit.completion_time && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Completion:</span>
                    <span>
                      {new Date(visit.completion_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Need to Contact Provider?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            If you need to reschedule or have questions about this appointment
          </p>
          {visit.organizations?.phone && (
            <Button variant="outline" className="w-full" asChild>
              <a href={`tel:${visit.organizations.phone}`}>
                Call {visit.organizations.phone}
              </a>
            </Button>
          )}
          {visit.organizations?.email && (
            <Button variant="outline" className="w-full" asChild>
              <a href={`mailto:${visit.organizations.email}`}>
                Email {visit.organizations.email}
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Refund Request */}
      {visit.status === 'completed' && userProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Request a Refund</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you're not satisfied with the service, you can request a refund
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setRefundDialogOpen(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Request Refund
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Refund Request Dialog */}
      {userProfile && visit && (
        <RefundRequestDialog
          open={refundDialogOpen}
          onOpenChange={setRefundDialogOpen}
          bookingId={visit.id}
          homeownerProfileId={userProfile.id}
          providerOrgId={visit.organizations?.id}
          bookingAmount={5000} // TODO: Get actual booking amount from payment record
          onSuccess={loadVisitDetails}
        />
      )}
    </div>
  );
}
