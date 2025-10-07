import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home, User, Briefcase, MapPin, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "homeowner" | "provider" | null;

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(false);

  // Auth data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Homeowner data
  const [homeownerData, setHomeownerData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  // Provider data
  const [providerData, setProviderData] = useState({
    companyName: "",
    ownerName: "",
    phone: "",
    serviceType: "",
    description: "",
    serviceArea: "",
  });

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleNext = () => {
    if (step === 2) {
      // Validate role-specific data
      if (role === "homeowner") {
        if (!homeownerData.name || !homeownerData.phone) {
          toast({
            title: "Error",
            description: "Please fill in all required fields",
            variant: "destructive",
          });
          return;
        }
      } else if (role === "provider") {
        if (!providerData.companyName || !providerData.ownerName || !providerData.phone) {
          toast({
            title: "Error",
            description: "Please fill in all required fields",
            variant: "destructive",
          });
          return;
        }
      }
      setStep(3);
    } else if (step === 3 && role === "homeowner") {
      // Validate address for homeowner
      if (!homeownerData.address || !homeownerData.city || !homeownerData.state || !homeownerData.zipCode) {
        toast({
          title: "Error",
          description: "Please fill in all address fields",
          variant: "destructive",
        });
        return;
      }
      setStep(4);
    } else if (step === 3 && role === "provider") {
      // Validate service info for provider
      if (!providerData.serviceType || !providerData.description) {
        toast({
          title: "Error",
          description: "Please fill in all service details",
          variant: "destructive",
        });
        return;
      }
      setStep(4);
    }
  };

  const handleSignup = async () => {
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please provide email and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned");

      // Create role-specific data
      if (role === "provider") {
        const slug = providerData.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .insert({
            owner_id: authData.user.id,
            name: providerData.companyName,
            slug: slug,
            description: providerData.description,
            service_type: providerData.serviceType,
            phone: providerData.phone,
            email: email,
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
          description: "Your provider account is ready. Welcome to HomeBase!",
        });

        navigate("/provider/dashboard");
      } else {
        // Homeowner flow - just show success
        toast({
          title: "Success!",
          description: "Your account has been created. Welcome to HomeBase!",
        });

        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = role === "homeowner" ? 4 : 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Home className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">HomeBase</span>
        </div>

        {/* Progress bar */}
        {step > 1 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              {[...Array(totalSteps)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full ${i < step ? 'bg-primary' : 'bg-muted'} ${i > 0 ? 'ml-2' : ''}`}
                />
              ))}
            </div>
            <p className="text-center text-muted-foreground">Step {step} of {totalSteps}</p>
          </div>
        )}

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Welcome to HomeBase</h2>
              <p className="text-muted-foreground">Are you a homeowner or service provider?</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card
                className="p-8 cursor-pointer hover:border-primary transition-all border-2"
                onClick={() => handleRoleSelect("homeowner")}
              >
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full h-20 w-20 mx-auto flex items-center justify-center mb-4">
                    <User className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Homeowner</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage all your home services in one place
                  </p>
                </div>
              </Card>

              <Card
                className="p-8 cursor-pointer hover:border-primary transition-all border-2"
                onClick={() => handleRoleSelect("provider")}
              >
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full h-20 w-20 mx-auto flex items-center justify-center mb-4">
                    <Briefcase className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Service Provider</h3>
                  <p className="text-sm text-muted-foreground">
                    Grow your business with subscriptions
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && role === "homeowner" && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
              <p className="text-muted-foreground">We'll use this to personalize your experience</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={homeownerData.name}
                  onChange={(e) => setHomeownerData({ ...homeownerData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={homeownerData.phone}
                  onChange={(e) => setHomeownerData({ ...homeownerData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && role === "provider" && (
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

        {/* Step 3: Additional Info */}
        {step === 3 && role === "homeowner" && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Where's your home?</h2>
              <p className="text-muted-foreground">We'll connect you with local service providers</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={homeownerData.address}
                  onChange={(e) => setHomeownerData({ ...homeownerData, address: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={homeownerData.city}
                    onChange={(e) => setHomeownerData({ ...homeownerData, city: e.target.value })}
                    placeholder="Springfield"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={homeownerData.state}
                    onChange={(e) => setHomeownerData({ ...homeownerData, state: e.target.value })}
                    placeholder="IL"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  value={homeownerData.zipCode}
                  onChange={(e) => setHomeownerData({ ...homeownerData, zipCode: e.target.value })}
                  placeholder="62701"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && role === "provider" && (
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
            </div>
          </div>
        )}

        {/* Step 4: Create Account */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-primary/10 rounded-full h-20 w-20 mx-auto flex items-center justify-center mb-4">
                <Home className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Create your account</h2>
              <p className="text-muted-foreground">Almost there! Set up your login credentials</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < 4 && step > 1 && (
            <Button onClick={handleNext} className="flex-1">
              Next
            </Button>
          )}
          {step === 4 && (
            <Button onClick={handleSignup} className="flex-1" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" className="p-0" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Signup;
