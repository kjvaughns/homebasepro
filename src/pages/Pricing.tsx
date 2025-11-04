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
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Free forever for homeowners. Flexible plans for service providers.<br />
          Get booked, manage clients, and get paid—all in one platform.
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
            <CardDescription className="mt-2 text-base font-medium">
              For Homeowners & New Providers
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
            <CardTitle className="text-3xl">Beta Plan</CardTitle>
            <div className="mt-4">
              <span className="text-5xl font-bold text-primary">$15</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <CardDescription className="mt-2 text-base font-medium">
              For Growing Service Providers
            </CardDescription>
            <CardDescription className="mt-2">
              <Badge variant="outline" className="text-xs">
                14-day free trial (no card required)
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
                "14-day free trial (no card required)",
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
          After your 14-day trial, choose Pro ($15/mo + 3% fees) or Free (8% fees). No card required to start.
        </p>
      </div>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What happens when my 14-day trial ends?</h3>
              <p className="text-muted-foreground text-sm">
                You'll choose between upgrading to Pro ($15/month + 3% transaction fees) or continuing with our Free plan (8% transaction fees). We'll send you reminder emails at day 7 and day 12 so you can decide what works best for your business.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Do I need a credit card to start?</h3>
              <p className="text-muted-foreground text-sm">
                No card required! Start your 14-day Pro trial immediately upon signup. After the trial, you can upgrade to Pro or downgrade to our Free plan—your choice.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">How do the transaction fees work?</h3>
              <p className="text-muted-foreground text-sm">
                Free plan: 8% per transaction. Pro plan: 3% per transaction + $15/month. On a $1,000 job, you'd save $50 with Pro vs Free. If you process ~$300/month, Pro pays for itself.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Is HomeBase really free for homeowners?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! Homeowners can browse providers, book services, and manage appointments completely free. Service providers pay a subscription to access business tools and accept bookings.
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
