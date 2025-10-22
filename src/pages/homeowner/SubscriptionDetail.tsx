import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar as CalendarIcon, DollarSign, Home, Phone, Mail, X, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [newServiceDate, setNewServiceDate] = useState<Date | undefined>(undefined);
  const [newTimeSlot, setNewTimeSlot] = useState("");

  useEffect(() => {
    loadSubscriptionDetails();
  }, [id]);

  const loadSubscriptionDetails = async () => {
    try {
      const { data: subData, error: subError } = await supabase
        .from("homeowner_subscriptions")
        .select(`
          *,
          service_plans(name, billing_frequency, price, description),
          organizations(name, phone, email),
          homes(name, address, city, state, zip_code)
        `)
        .eq("id", id)
        .single();

      if (subError) throw subError;
      setSubscription(subData);

      // Load service visits for this subscription
      const { data: visitsData } = await supabase
        .from("service_visits")
        .select("*")
        .eq("homeowner_subscription_id", id)
        .order("scheduled_date", { ascending: false });

      setVisits(visitsData || []);
    } catch (error) {
      console.error("Error loading subscription:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      const { error } = await supabase
        .from("homeowner_subscriptions")
        .update({ status: "canceled" })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription canceled",
      });

      navigate("/homeowner/subscriptions");
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    }
  };

  const handleReschedule = async () => {
    if (!newServiceDate || !newTimeSlot) {
      toast({
        title: "Error",
        description: "Please select a date and time",
        variant: "destructive",
      });
      return;
    }

    try {
      const scheduledDateTime = new Date(newServiceDate);
      const [hours, minutes] = newTimeSlot.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

      const { error } = await supabase
        .from("homeowner_subscriptions")
        .update({ next_service_date: scheduledDateTime.toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service rescheduled successfully",
      });

      setRescheduleDialogOpen(false);
      loadSubscriptionDetails();
    } catch (error) {
      console.error("Error rescheduling:", error);
      toast({
        title: "Error",
        description: "Failed to reschedule service",
        variant: "destructive",
      });
    }
  };

  const handleMessageProvider = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Check if conversation exists
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("homeowner_profile_id", profile.id)
        .eq("provider_org_id", subscription.provider_org_id)
        .maybeSingle();

      if (existingConv) {
        navigate("/homeowner/messages");
        return;
      }

      // Create new conversation
      const { error } = await supabase
        .from("conversations")
        .insert({
          homeowner_profile_id: profile.id,
          provider_org_id: subscription.provider_org_id,
        });

      if (error) throw error;

      navigate("/homeowner/messages");
    } catch (error) {
      console.error("Error opening conversation:", error);
      toast({
        title: "Error",
        description: "Failed to open conversation",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="container max-w-6xl py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Subscription not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/homeowner/subscriptions")}
          className="w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={handleMessageProvider} className="w-full sm:w-auto">
            <MessageSquare className="mr-2 h-4 w-4" />
            Message Provider
          </Button>
          {subscription.status === "active" && (
            <Button variant="default" size="sm" onClick={() => setRescheduleDialogOpen(true)} className="w-full sm:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Reschedule Next Service
            </Button>
          )}
        </div>
      </div>

      {/* Subscription Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{subscription.organizations?.name}</CardTitle>
              <p className="text-lg text-muted-foreground mt-1">{subscription.service_plans?.name}</p>
            </div>
            <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
              {subscription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Property</p>
                <p className="text-sm text-muted-foreground">{subscription.homes?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.homes?.address}, {subscription.homes?.city}, {subscription.homes?.state}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Billing</p>
                <p className="text-sm text-muted-foreground">
                  ${(subscription.billing_amount / 100).toFixed(2)} per {subscription.service_plans?.billing_frequency}
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscription.auto_renew ? "Auto-renews" : "Manual renewal"}
                </p>
              </div>
            </div>
          </div>

          {subscription.next_service_date && (
            <div className="flex items-start gap-3 pt-4 border-t">
              <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Next Service Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(subscription.next_service_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscription.organizations?.phone && (
            <div className="flex items-center text-sm">
              <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
              <span>{subscription.organizations.phone}</span>
            </div>
          )}
          {subscription.organizations?.email && (
            <div className="flex items-center text-sm">
              <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
              <span>{subscription.organizations.email}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service History */}
      <Card>
        <CardHeader>
          <CardTitle>Service History</CardTitle>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No service visits recorded yet
            </p>
          ) : (
            <div className="space-y-3">
              {visits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {new Date(visit.scheduled_date).toLocaleDateString()}
                    </p>
                    {visit.technician_name && (
                      <p className="text-sm text-muted-foreground">
                        Technician: {visit.technician_name}
                      </p>
                    )}
                  </div>
                  <Badge variant={
                    visit.status === "completed" ? "default" :
                    visit.status === "scheduled" ? "secondary" :
                    "outline"
                  }>
                    {visit.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone - Cancel Subscription */}
        {subscription.status === "active" && (
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="text-base">Subscription Management</CardTitle>
              <CardDescription>Cancel or modify your subscription</CardDescription>
            </CardHeader>
          <CardContent className="space-y-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/50">
                  <X className="mr-2 h-4 w-4" />
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently cancel your subscription. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go Back</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} className="bg-destructive">
                    Cancel Subscription
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Next Service</DialogTitle>
            <DialogDescription>
              Choose a new date and time for your next scheduled service
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Calendar
              mode="single"
              selected={newServiceDate}
              onSelect={setNewServiceDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
            <Select value={newTimeSlot} onValueChange={setNewTimeSlot}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="08:00">8:00 AM</SelectItem>
                <SelectItem value="10:00">10:00 AM</SelectItem>
                <SelectItem value="12:00">12:00 PM</SelectItem>
                <SelectItem value="14:00">2:00 PM</SelectItem>
                <SelectItem value="16:00">4:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReschedule}>Confirm Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
