import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { PaymentMethodManager } from "@/components/homeowner/PaymentMethodManager";
import { CheckCircle2 } from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useState } from "react";
import { toast } from "sonner";

export default function OnboardingHomeowner() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    lat: 0,
    lng: 0,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNext = async () => {
    if (step === 1 && (!formData.fullName || !formData.phone)) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (step === 2 && (!formData.address || !formData.city || !formData.state || !formData.zipCode)) {
      toast.error("Please fill in all address fields");
      return;
    }

    if (step === 2) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          // Update profile with full name and phone
          await supabase
            .from("profiles")
            .update({ 
              full_name: formData.fullName,
              phone: formData.phone,
              onboarded_at: new Date().toISOString() 
            })
            .eq("id", profile.id);
          
          // Note: Home address saved, user can add it in dashboard
          toast.success("Profile updated successfully");
        }
      }
    }

    setStep(step + 1);
  };

  const handleSkipPayment = () => {
    setStep(4);
  };

  const handleComplete = async () => {
    navigate("/homeowner/dashboard");
  };

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to HomeBase</CardTitle>
          <CardDescription>Let's get your account set up</CardDescription>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
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
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <AddressAutocomplete
                  label="Home Address"
                  placeholder="Start typing your address..."
                  defaultValue={formData.address}
                  onAddressSelect={(address) => {
                    setFormData({
                      ...formData,
                      address: address.street,
                      city: address.city,
                      state: address.state,
                      zipCode: address.zip,
                      lat: address.lat,
                      lng: address.lng,
                    });
                  }}
                  required
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      readOnly
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      readOnly
                      maxLength={2}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    readOnly
                    required
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payment Method (Optional)</h3>
                <p className="text-sm text-muted-foreground">
                  Add a payment method to book services faster
                </p>
                <PaymentMethodManager />
              </div>
            )}

            {step === 4 && (
              <div className="text-center space-y-4 py-8">
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
                <h3 className="text-2xl font-bold">All Set!</h3>
                <p className="text-muted-foreground">
                  Your account is ready. Let's find you some great service providers.
                </p>
              </div>
            )}

            <div className="flex justify-between mt-6">
              {step > 1 && step < 4 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              
              {step < 3 && (
                <Button type="submit" className="ml-auto">
                  Next
                </Button>
              )}

              {step === 3 && (
                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="outline" onClick={handleSkipPayment}>
                    Skip for Now
                  </Button>
                  <Button type="button" onClick={() => setStep(4)}>
                    Continue
                  </Button>
                </div>
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
