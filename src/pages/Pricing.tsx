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

      {/* Beta Banner */}
      <div className="bg-primary/10 border-y border-primary/20 py-3">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm md:text-base font-medium">
            🎉 <span className="font-bold text-primary">Beta Pricing Active:</span> 50% off all paid plans during beta. Prices will increase when beta ends. Lock in your discount now!
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Free forever for homeowners. Flexible plans for service providers.<br />
          Get booked, manage clients, and get paid—all in one platform.
        </p>
      </section>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 pb-16 grid md:grid-cols-3 gap-6">
        {/* FREE Plan Card */}
        <Card className="border-2 border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Free</CardTitle>
            <div className="mt-4">
              <span className="text-5xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <CardDescription className="mt-2">
              Try before you commit
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center py-2 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Up to 5 completed jobs/month</p>
              <p className="text-xs text-muted-foreground">8% transaction fee</p>
            </div>
            <ul className="space-y-3">
              {[
                "Core job creation",
                "Basic scheduling",
                "Basic customer list",
                "Basic quoting",
                "Basic invoicing with watermark",
                "Basic support",
                "No team seats (solo only)"
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            <Button onClick={() => navigate('/register')} className="w-full" variant="outline" size="lg">
              Get Started Free
            </Button>
          </CardFooter>
        </Card>

        {/* STARTER Plan (Recommended) */}
        <Card className="border-4 border-primary shadow-2xl relative overflow-hidden">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold z-10">
            Recommended
          </div>
          
          <CardHeader className="text-center pt-8">
            <CardTitle className="text-2xl">Starter</CardTitle>
            <div className="mt-4">
              <div className="text-lg line-through text-muted-foreground">$30/mo</div>
              <span className="text-5xl font-bold text-primary">$15</span>
              <span className="text-muted-foreground">/month</span>
              <p className="text-sm text-primary font-medium mt-1">🎉 Beta: 50% off</p>
            </div>
            <CardDescription className="mt-2">
              7-day free trial (card required)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center py-2 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">Unlimited jobs</p>
              <p className="text-xs text-muted-foreground">4% transaction fee · 3 team seats</p>
            </div>
            <ul className="space-y-3">
              {[
                "Standard invoicing (no watermark)",
                "Customer reminders",
                "Review requests",
                "Smart scheduling",
                "AI service descriptions",
                "AI pricing suggestions",
                "AI quoting",
                "AI message templates",
                "Automated quote follow-ups",
                "Payment reminder automation"
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            <Button onClick={handleStartTrial} disabled={loading} className="w-full bg-primary hover:bg-primary/90" size="lg">
              {loading ? "Starting trial..." : "Start 7-Day Trial"}
            </Button>
          </CardFooter>
        </Card>

        {/* PRO Plan */}
        <Card className="border-2 border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Pro</CardTitle>
            <div className="mt-4">
              <div className="text-lg line-through text-muted-foreground">$129/mo</div>
              <span className="text-5xl font-bold text-primary">$64.50</span>
              <span className="text-muted-foreground">/month</span>
              <p className="text-sm text-primary font-medium mt-1">🎉 Beta: 50% off</p>
            </div>
            <CardDescription className="mt-2">
              7-day free trial (card required)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center py-2 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Everything in Starter</p>
              <p className="text-xs text-muted-foreground">2% transaction fee · 10 team seats</p>
            </div>
            <ul className="space-y-3">
              {[
                "Team seats & permissions",
                "Team routing & assignments",
                "GPS job arrival & tracking",
                "Earnings & tax reports",
                "Custom booking link templates",
                "Priority support",
                "Add more team seats (pay per seat)"
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            <Button onClick={handleStartTrial} disabled={loading} className="w-full" size="lg">
              {loading ? "Starting trial..." : "Start 7-Day Trial"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What happens when my 7-day trial ends?</h3>
              <p className="text-muted-foreground text-sm">
                After your 7-day trial, you'll be charged for your selected plan (Starter or Pro). You can cancel anytime before the trial ends with no charges, or switch to our Free plan.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Do I need a credit card to start?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, a credit card is required to start your 7-day trial for Starter or Pro plans. The Free plan requires no card. You won't be charged during the trial period.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">How do the transaction fees work?</h3>
              <p className="text-muted-foreground text-sm">
                Free plan: 8% per transaction. Starter plan: 4% per transaction + $15/month (currently 50% off at $15/mo during beta). Pro plan: 2% per transaction + $64.50/month (50% off during beta). On a $1,000 job, Starter saves you $40 vs Free.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Is HomeBase really free for homeowners?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! Homeowners can browse providers, book services, and manage appointments completely free. Service providers pay a subscription to access business tools and accept bookings.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What happens when beta pricing ends?</h3>
              <p className="text-muted-foreground text-sm">
                When beta ends, plan prices will return to their full amounts: Starter $30/mo and Pro $129/mo. We'll notify all users at least 14 days before any price changes take effect.
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
