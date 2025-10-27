import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";
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
    selectedPlan: "free" as "free" | "beta",
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
      if (!formData.companyName || !formData.description || !formData.phone || !formData.businessAddress || !formData.businessZip) {
        toast.error("Please fill in all required fields including business address");
        return;
      }
    }

    if (step === 2) {
      if (!formData.serviceTypes || !formData.serviceArea) {
        toast.error("Please fill in service types and service area");
        return;
      }
    }

    if (step === 3) {
      if (!formData.selectedPlan) {
        toast.error("Please select a plan");
        return;
      }

      // Save organization data with selected plan
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
          description: formData.description,
          phone: formData.phone,
          service_type: formData.serviceTypes.split(',').map(s => s.trim()),
          service_area: formData.serviceArea,
          business_address: formData.businessAddress,
          business_city: formData.businessCity,
          business_state: formData.businessState,
          business_zip: formData.businessZip,
          business_lat: formData.businessLat || null,
          business_lng: formData.businessLng || null,
          owner_id: user.id,
          plan: formData.selectedPlan,
        };

        const { error } = await supabase
          .from("organizations")
          .insert(orgData);

        if (error) throw error;

        // If beta plan selected, initiate Stripe checkout
        if (formData.selectedPlan === 'beta') {
          const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
            'provider-subscription',
            {
              body: {
                action: 'create-subscription',
                plan: 'beta'
              }
            }
          );

          if (checkoutError) throw checkoutError;

          if (checkoutData?.checkoutUrl) {
            // Mark onboarding complete before redirect
            await supabase
              .from("profiles")
              .update({ onboarded_at: new Date().toISOString() })
              .eq("user_id", user.id);

            // Redirect to Stripe checkout
            window.location.href = checkoutData.checkoutUrl;
            return;
          }
        }

        // Mark onboarding complete for free plan
        await supabase
          .from("profiles")
          .update({ onboarded_at: new Date().toISOString() })
          .eq("user_id", user.id);

        toast.success("Account setup complete!");
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

  const progress = (step / 4) * 100;

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
                <div>
                  <Label htmlFor="companyName">Business Name *</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Business Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    required
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Business Phone *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold mb-4">Business Location *</h3>
                  <div className="space-y-4">
                    <AddressAutocomplete
                      label="Business Address"
                      placeholder="Start typing your business address..."
                      defaultValue={formData.businessAddress}
                      onAddressSelect={(address) => {
                        setFormData({
                          ...formData,
                          businessAddress: address.street,
                          businessCity: address.city,
                          businessState: address.state,
                          businessZip: address.zip,
                          businessLat: address.lat,
                          businessLng: address.lng,
                        });
                      }}
                      required
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="businessCity">City *</Label>
                        <Input
                          id="businessCity"
                          name="businessCity"
                          value={formData.businessCity}
                          onChange={handleInputChange}
                          inputMode="text"
                          required
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessState">State *</Label>
                        <Input
                          id="businessState"
                          name="businessState"
                          value={formData.businessState}
                          onChange={handleInputChange}
                          inputMode="text"
                          maxLength={2}
                          required
                          style={{ fontSize: '16px', textTransform: 'uppercase' }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="businessZip">ZIP Code *</Label>
                      <Input
                        id="businessZip"
                        name="businessZip"
                        value={formData.businessZip}
                        onChange={handleInputChange}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        style={{ fontSize: '16px' }}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Required for service jurisdiction and provider matching
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="serviceTypes">Service Types *</Label>
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
                  <Label htmlFor="serviceArea">Service Area (ZIP Codes) *</Label>
                  <Textarea
                    id="serviceArea"
                    name="serviceArea"
                    placeholder="e.g., 10001, 10002, 10003"
                    value={formData.serviceArea}
                    onChange={handleInputChange}
                    rows={3}
                    required
                    style={{ fontSize: '16px' }}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter ZIP codes you serve, separated by commas
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Choose Your Plan</h3>
                  <p className="text-muted-foreground">Select the plan that fits your business needs</p>
                </div>

                <div className="grid gap-4">
                  {/* Free Plan Card */}
                  <Card 
                    className={`cursor-pointer border-2 transition-all ${
                      formData.selectedPlan === 'free' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFormData({...formData, selectedPlan: 'free'})}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Free Plan</CardTitle>
                          <CardDescription>Perfect to get started</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold">$0</div>
                          <div className="text-sm text-muted-foreground">/month</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>✓ Up to 5 clients</li>
                        <li>✓ Payment links & invoices</li>
                        <li>✓ Client messaging</li>
                        <li>✓ 8% transaction fees</li>
                        <li>✓ Up to 5 team members</li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Beta Plan Card */}
                  <Card 
                    className={`cursor-pointer border-2 transition-all ${
                      formData.selectedPlan === 'beta' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFormData({...formData, selectedPlan: 'beta'})}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            Beta Plan
                            <Badge className="bg-primary">14-day trial</Badge>
                          </CardTitle>
                          <CardDescription>Everything you need to scale</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">$15</div>
                          <div className="text-sm text-muted-foreground">/month</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>✓ Everything in FREE, plus:</li>
                        <li>✓ Unlimited clients</li>
                        <li>✓ Lower fees (3%)</li>
                        <li>✓ Up to 3 team members</li>
                        <li>✓ Priority support</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-3">
                        Card required for trial. Cancel anytime.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center space-y-4 py-8">
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
                <h3 className="text-2xl font-bold">Account Created!</h3>
                <p className="text-muted-foreground">
                  Your provider account is ready. Let's get started with your dashboard.
                </p>
              </div>
            )}

            <div className="flex justify-between mt-6">
              {step > 1 && step < 4 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              
              {step < 4 && (
                <Button type="submit" disabled={loading} className="ml-auto">
                  {loading ? "Saving..." : "Next"}
                </Button>
              )}

              {step === 4 && (
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
