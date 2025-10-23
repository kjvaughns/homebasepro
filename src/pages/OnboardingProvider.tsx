import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home, Briefcase, Settings, CreditCard, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import homebaseLogo from "@/assets/homebase-logo.png";

const OnboardingProvider = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [trialComplete, setTrialComplete] = useState(false);
  const [paymentsComplete, setPaymentsComplete] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    phone: "",
    serviceType: "",
    description: "",
    serviceArea: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNext = () => {
    if (step === 1 && (!formData.companyName || !formData.ownerName || !formData.email || !formData.phone)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && (!formData.serviceType || !formData.description)) {
      toast({
        title: "Error",
        description: "Please fill in all service details",
        variant: "destructive",
      });
      return;
    }
    setStep(step + 1);
  };

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not authenticated", variant: "destructive" });
        navigate("/register");
        return;
      }

      // Check if org exists
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!existingOrg) {
        toast({ title: "Please complete steps 1-2 first", variant: "destructive" });
        setStep(1);
        return;
      }

      // Call edge function to create trial subscription
      const { data, error } = await supabase.functions.invoke('provider-subscription', {
        body: { action: 'create-subscription', plan: 'beta' }
      });

      if (error) throw error;

      if (data?.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast({ title: "Error", description: "Failed to start trial", variant: "destructive" });
      }
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: error.message || "Failed to start trial", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not authenticated", variant: "destructive" });
        navigate("/auth");
        return;
      }

      // Check if org exists
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select('id')
        .eq('owner_id', user.id)
        .single();

      let orgId = existingOrg?.id;

      // Create org if doesn't exist
      if (!orgId) {
        const slug = formData.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .insert({
            owner_id: user.id,
            name: formData.companyName,
            slug: slug,
            description: formData.description,
            service_type: formData.serviceType ? [formData.serviceType] : [],
            phone: formData.phone,
            email: formData.email,
            service_area: formData.serviceArea,
          })
          .select()
          .single();

        if (orgError) {
          console.error("Org creation error:", orgError);
          toast({ title: "Error", description: "Failed to create organization", variant: "destructive" });
          return;
        }
        orgId = orgData.id;
      }

      // Mark onboarding complete
      await supabase
        .from('profiles')
        .update({ onboarded_at: new Date().toISOString() })
        .eq('user_id', user.id);

      // Move to next step (trial signup)
      setStep(3);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
          <span className="text-2xl font-bold">HomeBase</span>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-2 rounded-full mx-2 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          <p className="text-center text-muted-foreground">Step {step} of 3</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Tell us about your business</h2>
              <p className="text-muted-foreground">We'll help you get set up to serve customers</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="ACME Home Services"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner/Manager Name *</Label>
                <Input
                  id="ownerName"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Business Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="contact@acmehome.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Business Phone *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
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
                <Label htmlFor="serviceType">Service Types *</Label>
                <Input
                  id="serviceType"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  placeholder="e.g., HVAC, Plumbing, Electrical (comma-separated)"
                />
                <p className="text-xs text-muted-foreground">
                  You can add multiple services separated by commas
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Service Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your services, expertise, and what makes you unique..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceArea">Service Area (Optional)</Label>
                <Input
                  id="serviceArea"
                  name="serviceArea"
                  value={formData.serviceArea}
                  onChange={handleInputChange}
                  placeholder="e.g., Greater Chicago Area"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-primary/10 rounded-full h-24 w-24 mx-auto flex items-center justify-center mb-4">
                <CreditCard className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Start your free trial</h2>
              <p className="text-muted-foreground">Get full access to HomeBase for 14 days</p>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-accent/5 p-6 rounded-lg border-2 border-primary/20">
              <div className="text-center mb-4">
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-primary">$15</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  after your 14-day free trial
                </p>
              </div>

              <div className="bg-background p-4 rounded-lg mb-4">
                <p className="text-sm font-semibold mb-3">What's included:</p>
                <ul className="text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Get booked by homeowners</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Unlimited clients</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Payment links & invoices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Client messaging</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Up to 3 team members</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>3% transaction fees</span>
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                <p className="text-xs text-amber-900 dark:text-amber-100">
                  <strong>Card required.</strong> Cancel anytime during your trial and you won't be charged.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1" disabled={loading}>
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={handleNext} className="flex-1" disabled={loading}>
              Next
            </Button>
          ) : step === 2 ? (
            <Button onClick={handleComplete} className="flex-1" disabled={loading}>
              {loading ? "Saving..." : "Next"}
            </Button>
          ) : (
            <Button onClick={handleStartTrial} className="flex-1 bg-primary" disabled={loading}>
              {loading ? "Starting trial..." : "Start Free Trial"}
            </Button>
          )}
        </div>

        <Button
          variant="link"
          className="w-full mt-4"
          onClick={() => navigate("/")}
        >
          Back to home
        </Button>
      </Card>
    </div>
  );
};

export default OnboardingProvider;
