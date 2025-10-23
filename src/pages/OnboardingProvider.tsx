import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Settings, CreditCard, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import homebaseLogo from "@/assets/homebase-logo.png";
import EmbeddedSubscriptionSetup from "@/components/provider/EmbeddedSubscriptionSetup";


const OnboardingProvider = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'beta' | null>(null);
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

  const handleTrialSuccess = () => {
    toast({
      title: "Trial activated!",
      description: "Your 14-day free trial is now active. Welcome to HomeBase!",
    });
    navigate('/provider/dashboard');
  };

  const handleFreePlanSelection = async () => {
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
            plan: 'free',
            transaction_fee_pct: 0.08,
            team_limit: 5
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

      // Mark onboarding complete with FREE plan
      await supabase
        .from('profiles')
        .update({ 
          onboarded_at: new Date().toISOString(),
          plan: 'free'
        })
        .eq('user_id', user.id);

      toast({
        title: "Welcome to HomeBase!",
        description: "Your FREE account is ready. Set up Stripe Connect in Settings to accept payments."
      });

      navigate('/provider/dashboard');
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
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

      // Move to next step (trial)
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
            <div className={`flex-1 h-2 rounded-full mx-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
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

        {step === 3 && !selectedPlan && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Choose Your Plan</h2>
              <p className="text-muted-foreground">Start free or try our premium features</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* FREE Plan Card */}
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedPlan('free')}>
                <CardHeader>
                  <Badge variant="outline" className="w-fit">FREE FOREVER</Badge>
                  <CardTitle className="text-2xl mt-2">Free Plan</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">$0</span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Up to 5 clients</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">8% transaction fees</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Up to 5 team members</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Basic features</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFreePlanSelection();
                    }}
                  >
                    Start with FREE Plan
                  </Button>
                </CardFooter>
              </Card>

              {/* BETA Trial Card */}
              <Card className="cursor-pointer hover:border-primary transition-colors border-primary" onClick={() => setSelectedPlan('beta')}>
                <CardHeader>
                  <Badge className="w-fit bg-primary">RECOMMENDED</Badge>
                  <CardTitle className="text-2xl mt-2">BETA Plan</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">$15</span>
                    <span className="text-muted-foreground">/month</span>
                    <Badge variant="outline" className="ml-2 text-xs">14-day free trial</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Unlimited clients</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">3% transaction fees</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Up to 3 team members</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">All features unlocked</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full bg-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan('beta');
                    }}
                  >
                    Start Free Trial
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

        {step === 3 && selectedPlan === 'beta' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-primary/10 rounded-full h-20 w-20 mx-auto flex items-center justify-center mb-4">
                <CreditCard className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Start your 14-day free trial</h2>
              <p className="text-muted-foreground">Add a card to activate your trial</p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg mb-4 text-center">
              <p className="text-sm font-semibold">
                <span className="text-3xl font-bold text-primary">$15</span>
                <span className="text-muted-foreground">/month</span> after 14 days
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cancel anytime before day 15 and you won't be charged
              </p>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedPlan(null)}
              className="mb-4"
            >
              ← Back to plan selection
            </Button>

            <EmbeddedSubscriptionSetup onSuccess={handleTrialSuccess} />
          </div>
        )}

        {step < 3 && (
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1" disabled={loading}>
                Back
              </Button>
            )}
            {step === 1 && (
              <Button onClick={handleNext} className="flex-1" disabled={loading}>
                Next
              </Button>
            )}
            {step === 2 && (
              <Button onClick={handleComplete} className="flex-1" disabled={loading}>
                {loading ? "Saving..." : "Continue"}
              </Button>
            )}
          </div>
        )}

        {step < 3 && (
          <Button
            variant="link"
            className="w-full mt-4"
            onClick={() => navigate("/")}
          >
            Back to home
          </Button>
        )}
      </Card>
    </div>
  );
};

export default OnboardingProvider;
