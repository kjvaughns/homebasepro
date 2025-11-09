import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import EmbeddedSubscriptionSetup from "@/components/provider/EmbeddedSubscriptionSetup";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useState, useEffect } from "react";

export default function OnboardingProvider() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    description: "",
    phone: "",
    serviceTypes: "",
    serviceArea: "",
    businessAddress: "",
    businessCity: "",
    businessState: "",
    businessZip: "",
    businessLat: 0,
    businessLng: 0,
  });

  // Pre-populate form with user data from auth metadata
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFormData(prev => ({
          ...prev,
          companyName: user.user_metadata?.full_name || prev.companyName,
          phone: user.user_metadata?.phone || prev.phone,
        }));
      }
    };
    loadUserData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.companyName || !formData.serviceTypes || !formData.businessZip) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Save organization data with free plan + auto-start trial
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Not authenticated");
          navigate("/auth");
          return;
        }

        const orgData = {
          name: formData.companyName,
          slug: formData.companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          service_type: formData.serviceTypes.split(',').map(s => s.trim()),
          service_area: formData.serviceArea || formData.businessZip,
          business_zip: formData.businessZip,
          owner_id: user.id,
          plan: 'free', // Start with free plan + 14-day trial
        };

        const { error } = await supabase
          .from("organizations")
          .insert(orgData);

        if (error) throw error;

        // Mark onboarding complete
        await supabase
          .from("profiles")
          .update({ onboarded_at: new Date().toISOString() })
          .eq("user_id", user.id);

        toast.success("Your 14-day Pro trial has started!");
      } catch (error: any) {
        console.error("Error:", error);
        toast.error(error.message || "Failed to complete setup");
        return;
      } finally {
        setLoading(false);
      }
    }

    setStep(step + 1);
  };

  const handleComplete = () => {
    // Redirect to dashboard - setup wizard will auto-open for new users
    navigate("/provider/dashboard");
  };

  const progress = (step / 2) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to HomeBase</CardTitle>
          <CardDescription>Set up your provider account</CardDescription>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
            {step === 1 && (
              <div className="space-y-4">
            {/* Step 1: Tell Us About Your Business */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName">Business Name *</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                  style={{ fontSize: '16px' }}
                  placeholder="e.g., Smith HVAC Services"
                />
              </div>
              <div>
                <Label htmlFor="serviceTypes">What services do you provide? *</Label>
                <Input
                  id="serviceTypes"
                  name="serviceTypes"
                  placeholder="e.g., HVAC, Plumbing, Electrical"
                  value={formData.serviceTypes}
                  onChange={handleInputChange}
                  required
                  style={{ fontSize: '16px' }}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Separate multiple services with commas
                </p>
              </div>
              <div>
                <Label htmlFor="businessZip">Service Area (ZIP Code) *</Label>
                <Input
                  id="businessZip"
                  name="businessZip"
                  value={formData.businessZip}
                  onChange={(e) => {
                    handleInputChange(e);
                    setFormData(prev => ({ ...prev, serviceArea: e.target.value }));
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  style={{ fontSize: '16px' }}
                  placeholder="e.g., 10001"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  We'll use this to connect you with nearby clients
                </p>
              </div>
            </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 text-center py-8">
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold">You're All Set! 🎉</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your <strong>14-day Pro trial</strong> has started! Enjoy unlimited clients, AI assistance, and all premium features.
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto">
                  <p className="text-sm font-medium mb-3">What's included in your trial:</p>
                  <ul className="text-sm space-y-2 text-left">
                    <li className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>Unlimited clients & jobs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>AI-powered assistance</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>Advanced analytics</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>Priority support</span>
                    </li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  No credit card required. Upgrade anytime.
                </p>
              </div>
            )}

            <div className="flex justify-between mt-6">
              {step > 1 && step < 2 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              
              {step === 1 && (
                <Button type="submit" disabled={loading} className="ml-auto">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Start My Free Trial"}
                </Button>
              )}

              {step === 2 && (
                <Button onClick={handleComplete} className="ml-auto">
                  Go to Dashboard
                </Button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:underline">
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
