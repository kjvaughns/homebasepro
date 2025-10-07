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

const OnboardingProvider = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
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

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please sign up first",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Create slug from company name
      const slug = formData.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          owner_id: user.id,
          name: formData.companyName,
          slug: slug,
          description: formData.description,
          service_type: formData.serviceType,
          phone: formData.phone,
          email: formData.email,
          service_area: formData.serviceArea,
        })
        .select()
        .single();

      if (orgError) {
        console.error("Error creating organization:", orgError);
        toast({
          title: "Error",
          description: "Failed to create organization. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Create subscription on free plan
      const { error: subError } = await supabase
        .from("organization_subscriptions")
        .insert({
          organization_id: orgData.id,
          plan_tier: "free",
          status: "active",
        });

      if (subError) {
        console.error("Error creating subscription:", subError);
        toast({
          title: "Error",
          description: "Failed to create subscription. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success!",
        description: "Your provider account is ready. Welcome to HomeBase!",
      });
      
      navigate("/provider/dashboard");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
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
                <Label htmlFor="serviceType">Primary Service Type *</Label>
                <Input
                  id="serviceType"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  placeholder="e.g., HVAC, Plumbing, Landscaping"
                />
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
          <div className="space-y-6 text-center">
            <div className="bg-primary/10 rounded-full h-24 w-24 mx-auto flex items-center justify-center mb-4">
              <Briefcase className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">You're ready to grow!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your provider profile is set up. You'll start on our <strong>Free Plan</strong> with up to 5 clients and 8% transaction fees. You can upgrade anytime as you grow!
            </p>
            <div className="bg-muted p-4 rounded-lg text-left max-w-md mx-auto">
              <p className="text-sm font-semibold mb-2">Free Plan includes:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Up to 5 clients</li>
                <li>✓ Client Management</li>
                <li>✓ Recurring Billing</li>
                <li>✓ Basic Support</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          {step > 1 && step < 3 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext} className="flex-1">
              Next
            </Button>
          ) : (
            <Button onClick={handleComplete} className="flex-1">
              Complete Setup
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
