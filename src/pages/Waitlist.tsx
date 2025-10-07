import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Sparkles } from "lucide-react";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().regex(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, "Invalid phone number (use format: 123-456-7890)"),
  account_type: z.enum(['homeowner', 'provider']),
  business_name: z.string().trim().max(100).optional(),
  service_type: z.string().optional(),
  zip_code: z.string().trim().regex(/^\d{5}$/, "Invalid ZIP code").optional(),
  referral_source: z.string().trim().max(200).optional(),
});

export default function Waitlist() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    account_type: "homeowner" as "homeowner" | "provider",
    full_name: "",
    email: "",
    phone: "",
    business_name: "",
    service_type: "",
    zip_code: "",
    referral_source: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = waitlistSchema.parse(formData);
      setLoading(true);

      const dataToInsert = {
        email: validatedData.email,
        full_name: validatedData.full_name,
        phone: validatedData.phone,
        account_type: validatedData.account_type,
        business_name: validatedData.business_name || null,
        service_type: validatedData.service_type || null,
        zip_code: validatedData.zip_code || null,
        referral_source: validatedData.referral_source || null,
      };

      const { error } = await supabase
        .from("waitlist")
        .insert([dataToInsert]);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already on the waitlist",
            description: "This email is already registered. We'll notify you when we launch!",
            variant: "default",
          });
        } else {
          throw error;
        }
        return;
      }

      // Navigate to thank you without counting (RLS-safe)
      navigate("/waitlist/thank-you", {
        state: {
          full_name: validatedData.full_name,
          account_type: validatedData.account_type,
        },
      });

      toast({
        title: "Welcome to HomeBase! 🎉",
        description: "You've secured your lifetime 25% discount!",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (step === 3) {
    // Calculate discounted pricing (25% off)
    const pricingPlans = [
      { name: "Free Plan", original: 0, discounted: 0, fee: "8% → 6%" },
      { name: "Growth", original: 49, discounted: 37, fee: "2.5% → 1.9%" },
      { name: "Pro", original: 129, discounted: 97, fee: "2.0% → 1.5%" },
      { name: "Scale", original: 299, discounted: 224, fee: "1.5% → 1.1%" },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl md:text-3xl">Welcome to HomeBase! 🎉</CardTitle>
            <CardDescription className="text-base">
              You're officially an early adopter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-primary/5 p-6 rounded-lg space-y-2 text-center">
              <p className="text-sm text-muted-foreground">Your Waitlist Position</p>
              <p className="text-4xl font-bold text-primary">#{waitlistPosition}</p>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Your Early Adopter Perks:</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xl">🎁</span>
                  <div>
                    <p className="font-semibold">Lifetime 25% Discount</p>
                    <p className="text-muted-foreground">Lock in discounted pricing forever on all plans</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xl">⚡</span>
                  <div>
                    <p className="font-semibold">Priority Access</p>
                    <p className="text-muted-foreground">First to access new features and updates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xl">💬</span>
                  <div>
                    <p className="font-semibold">Direct Feedback Line</p>
                    <p className="text-muted-foreground">Help shape the platform with your input</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xl">📧</span>
                  <div>
                    <p className="font-semibold">Launch Notification</p>
                    <p className="text-muted-foreground">We'll email you as soon as we go live</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Your Discounted Pricing:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {pricingPlans.map((plan) => (
                  <div key={plan.name} className="p-4 border rounded-lg space-y-1">
                    <p className="font-semibold">{plan.name}</p>
                    {plan.original === 0 ? (
                      <p className="text-2xl font-bold text-primary">Free</p>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-bold text-primary">${plan.discounted}</p>
                          <p className="text-sm text-muted-foreground line-through">${plan.original}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">per month</p>
                      </>
                    )}
                    <p className="text-xs text-muted-foreground">Transaction Fee: {plan.fee}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground italic">
                These rates are locked in for life when you sign up at launch
              </p>
            </div>

            <Button onClick={() => navigate("/")} className="w-full" size="lg">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => step === 1 ? navigate("/") : setStep(1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2">
                <div className={`h-2 w-20 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`h-2 w-20 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              </div>
              <span className="text-sm text-muted-foreground">Step {step} of 2</span>
            </div>
            <CardTitle className="text-xl md:text-2xl">Join the Waitlist</CardTitle>
            <CardDescription className="text-sm md:text-base">
              {step === 1 
                ? "Choose your account type to get started"
                : `Tell us about ${formData.account_type === 'homeowner' ? 'yourself' : 'your business'}`
              }
            </CardDescription>
            <div className="bg-primary/10 text-primary px-3 py-2 rounded-lg text-xs md:text-sm font-medium mt-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Early Access Bonus: Lifetime 25% Discount on All Plans
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <div className="space-y-4">
                  <Label>I am a...</Label>
                  <RadioGroup
                    value={formData.account_type}
                    onValueChange={(value) => updateField("account_type", value)}
                  >
                    <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="homeowner" id="homeowner" />
                      <Label htmlFor="homeowner" className="cursor-pointer flex-1">
                        <div className="font-semibold">Homeowner</div>
                        <div className="text-sm text-muted-foreground">Looking for reliable home maintenance</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="provider" id="provider" />
                      <Label htmlFor="provider" className="cursor-pointer flex-1">
                        <div className="font-semibold">Service Provider</div>
                        <div className="text-sm text-muted-foreground">Grow my business with subscriptions</div>
                      </Label>
                    </div>
                  </RadioGroup>

                  <Button type="button" onClick={() => setStep(2)} className="w-full" size="lg">
                    Continue
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                      required
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      required
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      required
                      placeholder="123-456-7890"
                    />
                  </div>

                  {formData.account_type === "provider" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="business_name">Business Name *</Label>
                        <Input
                          id="business_name"
                          value={formData.business_name}
                          onChange={(e) => updateField("business_name", e.target.value)}
                          required
                          placeholder="ABC Services Inc."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="service_type">Primary Service Type *</Label>
                        <Select
                          value={formData.service_type}
                          onValueChange={(value) => updateField("service_type", value)}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hvac">HVAC</SelectItem>
                            <SelectItem value="plumbing">Plumbing</SelectItem>
                            <SelectItem value="electrical">Electrical</SelectItem>
                            <SelectItem value="landscaping">Landscaping</SelectItem>
                            <SelectItem value="pool">Pool Maintenance</SelectItem>
                            <SelectItem value="cleaning">Cleaning</SelectItem>
                            <SelectItem value="pest_control">Pest Control</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="zip_code">ZIP Code *</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => updateField("zip_code", e.target.value)}
                      required
                      placeholder="12345"
                      maxLength={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referral_source">How did you hear about us? (Optional)</Label>
                    <Input
                      id="referral_source"
                      value={formData.referral_source}
                      onChange={(e) => updateField("referral_source", e.target.value)}
                      placeholder="Google, Friend, Social Media, etc."
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Joining..." : "Join Waitlist"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}