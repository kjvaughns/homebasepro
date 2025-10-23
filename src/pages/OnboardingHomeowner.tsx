import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import homebaseLogo from "@/assets/homebase-logo.png";
import { PaymentMethodManager } from "@/components/homeowner/PaymentMethodManager";

const OnboardingHomeowner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNext = () => {
    if (step === 1 && (!formData.name || !formData.email || !formData.phone)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && (!formData.address || !formData.city || !formData.state || !formData.zipCode)) {
      toast({
        title: "Error",
        description: "Please fill in all address fields",
        variant: "destructive",
      });
      return;
    }
    setStep(step + 1);
  };

  const handleSkipPayment = () => {
    setStep(4);
  };

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not authenticated", variant: "destructive" });
        navigate("/register");
        return;
      }

      // Save property to database
      const { error: propError } = await supabase
        .from('properties')
        .insert({
          homeowner_id: user.id,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
        });

      if (propError) {
        console.error("Property save error:", propError);
        toast({ title: "Error", description: "Failed to save property", variant: "destructive" });
        return;
      }

      // Mark onboarding complete
      await supabase
        .from('profiles')
        .update({ onboarded_at: new Date().toISOString() })
        .eq('user_id', user.id);

      toast({ title: "Success!", description: "Welcome to HomeBase!" });
      navigate("/homeowner/dashboard");
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
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
            <div className={`flex-1 h-2 rounded-full mx-2 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 4 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          <p className="text-center text-muted-foreground">Step {step} of 4</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Welcome! Let's get started</h2>
              <p className="text-muted-foreground">Tell us a bit about yourself</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Where's your home?</h2>
              <p className="text-muted-foreground">We'll use this to connect you with local service providers</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Springfield"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="IL"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  placeholder="62701"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Payment Method</h2>
              <p className="text-muted-foreground">
                Add a payment method to book services faster (optional)
              </p>
            </div>
            <PaymentMethodManager />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center">
            <div className="bg-primary/10 rounded-full h-24 w-24 mx-auto flex items-center justify-center mb-4">
              <Home className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">You're all set!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your homeowner profile is ready. Create an account to start managing your home services.
            </p>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          {step > 1 && step < 4 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext} className="flex-1">
              Next
            </Button>
          ) : step === 3 ? (
            <>
              <Button variant="outline" onClick={handleSkipPayment} className="flex-1">
                Skip for Now
              </Button>
              <Button onClick={() => setStep(4)} className="flex-1">
                Continue
              </Button>
            </>
          ) : (
            <Button onClick={handleComplete} className="flex-1">
              Go to Dashboard
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

export default OnboardingHomeowner;
