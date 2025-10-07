import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home, Briefcase, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const BecomeProvider = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [providerData, setProviderData] = useState({
    companyName: "",
    ownerName: "",
    phone: "",
    serviceType: "",
    description: "",
    serviceArea: "",
  });

  const handleNext = () => {
    if (step === 1 && (!providerData.companyName || !providerData.ownerName || !providerData.phone)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    if (!providerData.serviceType || !providerData.description) {
      toast({
        title: "Error",
        description: "Please fill in all service details",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      const slug = providerData.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          owner_id: user.id,
          name: providerData.companyName,
          slug: slug,
          description: providerData.description,
          service_type: providerData.serviceType,
          phone: providerData.phone,
          email: user.email,
          service_area: providerData.serviceArea,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create free plan subscription
      const { error: subError } = await supabase
        .from("organization_subscriptions")
        .insert({
          organization_id: orgData.id,
          plan_tier: "free",
          status: "active",
        });

      if (subError) throw subError;

      toast({
        title: "Success!",
        description: "You're now a service provider! Welcome to HomeBase Pro.",
      });

      navigate("/provider/dashboard");
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to set up provider account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Home className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">HomeBase</span>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-2 rounded-full ml-2 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          <p className="text-center text-muted-foreground">Step {step} of 2</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Become a Service Provider</h2>
              <p className="text-muted-foreground">Tell us about your business</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={providerData.companyName}
                  onChange={(e) => setProviderData({ ...providerData, companyName: e.target.value })}
                  placeholder="ACME Home Services"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner/Manager Name *</Label>
                <Input
                  id="ownerName"
                  value={providerData.ownerName}
                  onChange={(e) => setProviderData({ ...providerData, ownerName: e.target.value })}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Business Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={providerData.phone}
                  onChange={(e) => setProviderData({ ...providerData, phone: e.target.value })}
                  placeholder="(555) 987-6543"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Settings className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">What services do you offer?</h2>
              <p className="text-muted-foreground">Help customers understand what you specialize in</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serviceType">Primary Service Type *</Label>
                <Input
                  id="serviceType"
                  value={providerData.serviceType}
                  onChange={(e) => setProviderData({ ...providerData, serviceType: e.target.value })}
                  placeholder="e.g., HVAC, Plumbing, Landscaping"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Service Description *</Label>
                <Textarea
                  id="description"
                  value={providerData.description}
                  onChange={(e) => setProviderData({ ...providerData, description: e.target.value })}
                  placeholder="Describe your services, expertise, and what makes you unique..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceArea">Service Area (Optional)</Label>
                <Input
                  id="serviceArea"
                  value={providerData.serviceArea}
                  onChange={(e) => setProviderData({ ...providerData, serviceArea: e.target.value })}
                  placeholder="e.g., Greater Chicago Area"
                />
              </div>
              
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">You'll start on the Free Plan:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Up to 5 clients</li>
                  <li>✓ Client Management & Recurring Billing</li>
                  <li>✓ 8% transaction fee</li>
                  <li>✓ Upgrade anytime as you grow</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={handleNext} className="flex-1">
              Next
            </Button>
          ) : (
            <Button onClick={handleComplete} className="flex-1" disabled={loading}>
              {loading ? "Setting up..." : "Complete Setup"}
            </Button>
          )}
        </div>

        <Button
          variant="link"
          className="w-full mt-4"
          onClick={() => navigate("/dashboard")}
        >
          Back to dashboard
        </Button>
      </Card>
    </div>
  );
};

export default BecomeProvider;
