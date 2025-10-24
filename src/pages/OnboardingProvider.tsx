import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import EmbeddedSubscriptionSetup from "@/components/provider/EmbeddedSubscriptionSetup";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useState } from "react";

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

      // Save organization data
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
          slug: formData.companyName.toLowerCase().replace(/\s+/g, '-'),
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

        toast.success("Organization created successfully");
      } catch (error: any) {
        console.error("Error:", error);
        toast.error(error.message || "Failed to create organization");
        return;
      } finally {
        setLoading(false);
      }
    }

    setStep(step + 1);
  };

  const handleComplete = () => {
    navigate("/provider/dashboard");
  };

  const progress = (step / 3) * 100;

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
              <div className="text-center space-y-4 py-8">
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
                <h3 className="text-2xl font-bold">Account Created!</h3>
                <p className="text-muted-foreground">
                  Your provider account is ready. Let's get started with your dashboard.
                </p>
              </div>
            )}

            <div className="flex justify-between mt-6">
              {step > 1 && step < 3 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              
              {step < 3 && (
                <Button type="submit" disabled={loading} className="ml-auto">
                  {loading ? "Saving..." : "Next"}
                </Button>
              )}

              {step === 3 && (
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
