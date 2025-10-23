import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import homebaseLogo from "@/assets/homebase-logo.png";

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [envCheck, setEnvCheck] = useState({ hasStripe: false, hasPrice: false });

  useEffect(() => {
    checkStripeConfig();
  }, []);

  const checkStripeConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-config');
      if (!error && data?.publishableKey) {
        setEnvCheck({ hasStripe: true, hasPrice: true });
      }
    } catch (e) {
      console.error('Stripe config check failed:', e);
    }
  };

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/register');
        return;
      }

      navigate('/onboarding/provider');
    } catch (error: any) {
      console.error('Navigation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
            <span className="text-2xl font-bold">HomeBase</span>
          </div>
          <Button onClick={() => navigate("/register")} size="sm" className="bg-primary hover:bg-primary/90">
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 text-center">
        <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
          ⚡ BETA LAUNCH SPECIAL
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Start Your Free Trial Today
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get booked, manage clients, and get paid—all in one platform.<br />
          <strong>14 days free, then just $15/month.</strong>
        </p>
      </section>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-16 grid md:grid-cols-2 gap-6">
        {/* FREE Plan Card */}
        <Card className="border-2 border-border shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Badge variant="outline">FREE FOREVER</Badge>
            </div>
            <CardTitle className="text-3xl">Free Plan</CardTitle>
            <div className="mt-4">
              <span className="text-5xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <CardDescription className="mt-2">
              Perfect to get started
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {[
                "Start immediately (no card required)",
                "Up to 5 clients",
                "Payment links & invoices",
                "Client messaging",
                "8% transaction fees",
                "Up to 5 team members",
                "Stripe Connect required for payments",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            <Button
              onClick={() => navigate('/register')}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Get Started Free
            </Button>
          </CardFooter>
        </Card>

        {/* BETA Plan Card */}
        <Card className="border-2 border-primary shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Badge className="bg-primary text-primary-foreground">BETA ACCESS</Badge>
            </div>
            <CardTitle className="text-3xl">HomeBase BETA</CardTitle>
            <div className="mt-4">
              <span className="text-5xl font-bold text-primary">$15</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <CardDescription className="mt-2">
              <Badge variant="outline" className="text-xs">
                14-day free trial (card required)
              </Badge>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {[
                "Everything in FREE, plus:",
                "Unlimited clients",
                "Lower transaction fees (3%)",
                "Up to 3 team members",
                "All features unlocked",
                "Priority support",
                "14-day free trial (card required)",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

          </CardContent>

          <CardFooter>
            <Button
              onClick={handleStartTrial}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              {loading ? (
                "Starting trial..."
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Start Free Trial
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Cancel anytime during your trial. No charge until day 15.
        </p>
      </div>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Why do I need to add a card for the free trial?</h3>
              <p className="text-muted-foreground text-sm">
                We require a card to prevent abuse and ensure serious business owners join the platform. You won't be charged during your 14-day trial.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Can I cancel before the trial ends?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! Cancel anytime before day 15 and you won't be charged. Your account will remain active until the trial period ends.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What happens after the trial?</h3>
              <p className="text-muted-foreground text-sm">
                Your card will be charged $15 on day 15 and monthly thereafter. You'll keep full access to all features.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What are the 3% transaction fees?</h3>
              <p className="text-muted-foreground text-sm">
                When you receive payments through HomeBase, we charge 3% per transaction. This covers payment processing and platform costs.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; 2025 HomeBase. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="/terms" className="hover:text-foreground">Terms</a>
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
            <a href="mailto:support@homebaseproapp.com" className="hover:text-foreground">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
