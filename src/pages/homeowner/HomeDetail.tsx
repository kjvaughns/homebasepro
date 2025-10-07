import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function HomeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [home, setHome] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeDetails();
  }, [id]);

  const loadHomeDetails = async () => {
    try {
      const { data: homeData, error: homeError } = await supabase
        .from("homes")
        .select("*")
        .eq("id", id)
        .single();

      if (homeError) throw homeError;
      setHome(homeData);

      // Load subscriptions for this home
      const { data: subsData } = await supabase
        .from("homeowner_subscriptions")
        .select(`
          *,
          service_plans(name, billing_frequency, price),
          organizations(name)
        `)
        .eq("home_id", id)
        .order("created_at", { ascending: false });

      setSubscriptions(subsData || []);

      // Load visits for this home
      const { data: visitsData } = await supabase
        .from("service_visits")
        .select(`
          *,
          organizations(name)
        `)
        .eq("home_id", id)
        .order("scheduled_date", { ascending: false })
        .limit(10);

      setVisits(visitsData || []);
    } catch (error) {
      console.error("Error loading home details:", error);
      toast({
        title: "Error",
        description: "Failed to load property details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("homes").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property deleted successfully",
      });

      navigate("/homeowner/homes");
    } catch (error) {
      console.error("Error deleting home:", error);
      toast({
        title: "Error",
        description: "Failed to delete property",
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

  if (!home) {
    return (
      <div className="container max-w-6xl py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Property not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/homeowner/homes")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this property and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Property Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {home.name}
                {home.is_primary && (
                  <Badge variant="secondary">Primary</Badge>
                )}
              </CardTitle>
              <div className="flex items-center text-muted-foreground mt-2">
                <MapPin className="h-4 w-4 mr-2" />
                {home.address}, {home.city}, {home.state} {home.zip_code}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {home.property_type && (
              <div>
                <p className="text-sm text-muted-foreground">Property Type</p>
                <p className="font-medium capitalize">{home.property_type.replace("_", " ")}</p>
              </div>
            )}
            {home.square_footage && (
              <div>
                <p className="text-sm text-muted-foreground">Square Footage</p>
                <p className="font-medium">{home.square_footage.toLocaleString()} sq ft</p>
              </div>
            )}
            {home.year_built && (
              <div>
                <p className="text-sm text-muted-foreground">Year Built</p>
                <p className="font-medium">{home.year_built}</p>
              </div>
            )}
          </div>
          {home.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="mt-1">{home.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Services</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active services for this property
            </p>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{sub.organizations?.name}</p>
                    <p className="text-sm text-muted-foreground">{sub.service_plans?.name}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                      {sub.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      ${(sub.billing_amount / 100).toFixed(2)}/{sub.service_plans?.billing_frequency}
                    </p>
                  </div>
                </div>
              ))}
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
              No service visits recorded
            </p>
          ) : (
            <div className="space-y-3">
              {visits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{visit.organizations?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(visit.scheduled_date).toLocaleDateString()}
                    </p>
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
    </div>
  );
}
