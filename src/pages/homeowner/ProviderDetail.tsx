import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Phone, Mail, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [provider, setProvider] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [homes, setHomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedHome, setSelectedHome] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadProviderDetails();
    loadUserHomes();
  }, [id]);

  const loadProviderDetails = async () => {
    try {
      const { data: providerData, error: providerError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .single();

      if (providerError) throw providerError;
      setProvider(providerData);

      const { data: plansData, error: plansError } = await supabase
        .from("service_plans")
        .select("*")
        .eq("organization_id", id)
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData || []);
    } catch (error) {
      console.error("Error loading provider:", error);
      toast({
        title: "Error",
        description: "Failed to load provider details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserHomes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data: homesData } = await supabase
        .from("homes")
        .select("*")
        .eq("owner_id", profile.id)
        .order("is_primary", { ascending: false });

      setHomes(homesData || []);
    } catch (error) {
      console.error("Error loading homes:", error);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedHome || !selectedPlan) {
      toast({
        title: "Error",
        description: "Please select a property",
        variant: "destructive",
      });
      return;
    }

    setSubscribing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase.from("homeowner_subscriptions").insert({
        homeowner_id: profile.id,
        provider_org_id: id,
        home_id: selectedHome,
        service_plan_id: selectedPlan.id,
        billing_amount: selectedPlan.price,
        status: "active",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully subscribed to plan",
      });

      setDialogOpen(false);
      navigate("/homeowner/subscriptions");
    } catch (error) {
      console.error("Error subscribing:", error);
      toast({
        title: "Error",
        description: "Failed to subscribe to plan",
        variant: "destructive",
      });
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="container max-w-6xl py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Provider not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/homeowner/browse")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Browse
      </Button>

      {/* Provider Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl">{provider.name}</CardTitle>
              {provider.service_type && (
                <Badge variant="secondary">{provider.service_type}</Badge>
              )}
              {provider.description && (
                <CardDescription className="text-base mt-2">
                  {provider.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {provider.service_area && (
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Service Area: {provider.service_area}</span>
            </div>
          )}
          {provider.phone && (
            <div className="flex items-center text-sm">
              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{provider.phone}</span>
            </div>
          )}
          {provider.email && (
            <div className="flex items-center text-sm">
              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{provider.email}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Plans */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Available Plans</h2>
        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No plans available at the moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.description && (
                    <CardDescription>{plan.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div>
                    <div className="text-3xl font-bold">
                      ${(plan.price / 100).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      per {plan.billing_frequency}
                    </div>
                  </div>

                  {plan.includes_features && Array.isArray(plan.includes_features) && plan.includes_features.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Includes:</p>
                      <ul className="space-y-1">
                        {plan.includes_features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-start text-sm">
                            <Check className="h-4 w-4 mr-2 text-primary flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full"
                        onClick={() => setSelectedPlan(plan)}
                        disabled={homes.length === 0}
                      >
                        {homes.length === 0 ? "Add a Property First" : "Subscribe Now"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Subscribe to {plan.name}</DialogTitle>
                        <DialogDescription>
                          Select which property you'd like this service for
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Select Property</Label>
                          <Select value={selectedHome} onValueChange={setSelectedHome}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a property" />
                            </SelectTrigger>
                            <SelectContent>
                              {homes.map((home) => (
                                <SelectItem key={home.id} value={home.id}>
                                  {home.name} - {home.address}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={handleSubscribe}
                          disabled={subscribing || !selectedHome}
                          className="w-full"
                        >
                          {subscribing ? "Subscribing..." : "Confirm Subscription"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
