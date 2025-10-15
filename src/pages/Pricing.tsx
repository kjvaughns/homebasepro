import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import homebaseLogo from "@/assets/homebase-logo.png";

const Pricing = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Free",
      price: { monthly: 0, annual: 0 },
      clients: "Up to 5 clients",
      team: "1 owner",
      features: [
        "Provider profile & listing",
        "Basic calendar & manual scheduling",
        "Client list (read + basic notes)",
        "Simple invoices (send & mark paid)",
        "Basic messaging",
      ],
      cta: "Join Waitlist",
      highlighted: false,
    },
    {
      name: "Growth",
      price: { monthly: 49, annual: 470 },
      clients: "Unlimited",
      team: "Up to 1 team member (owner + 1)",
      features: [
        "Everything in Free",
        "Quotes → Jobs pipeline",
        "Stripe payments & payouts",
        "Reviews (request & display)",
        "Reminders & follow-ups",
      ],
      cta: "Join Waitlist",
      highlighted: true,
    },
    {
      name: "Pro",
      price: { monthly: 129, annual: 1240 },
      clients: "Unlimited",
      team: "Up to 3 team members",
      features: [
        "Everything in Growth",
        "Team calendar & assignment",
        "Basic analytics dashboard",
        "Multi-stop route planning",
        "Branding options (logo/colors)",
      ],
      cta: "Join Waitlist",
      highlighted: false,
    },
    {
      name: "Scale",
      price: { monthly: 299, annual: 2870 },
      clients: "Unlimited",
      team: "Up to 10 team members",
      features: [
        "Everything in Pro",
        "Multi-location support",
        "Roles & permissions",
        "Priority marketplace placement",
        "API/Webhooks",
      ],
      cta: "Join Waitlist",
      highlighted: false,
    },
  ];

  const getPrice = (plan: typeof plans[0]) => {
    if (plan.price.monthly === 0) return 0;
    if (billingPeriod === "monthly") return plan.price.monthly;
    // For annual: show monthly equivalent (annual price ÷ 12)
    return Math.round(plan.price.annual / 12);
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (billingPeriod === "monthly" || plan.price.monthly === 0) return null;
    const monthlyCost = plan.price.monthly * 12;
    const annualCost = plan.price.annual;
    const savings = monthlyCost - annualCost;
    return savings > 0 ? savings : null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
            <span className="text-2xl font-bold text-foreground">HomeBase</span>
          </div>
          <Button onClick={() => navigate("/waitlist")} size="sm">
            Join Waitlist
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Start free, scale as you grow.
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-muted p-2 rounded-lg mb-4">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === "monthly"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === "annual"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto px-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative p-8 flex flex-col shadow-md rounded-lg ${
              plan.highlighted
                ? "border-[#16A34A] shadow-xl"
                : "border-border"
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#16A34A] text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
            )}
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#16A34A]">
                  ${getPrice(plan)}
                </span>
                {plan.price.monthly > 0 && (
                  <span className="text-muted-foreground">/mo</span>
                )}
              </div>
              {billingPeriod === "annual" && plan.price.annual > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  billed ${plan.price.annual} annually
                </p>
              )}
              {getSavings(plan) && (
                <p className="text-sm text-[#16A34A] font-medium mt-1">
                  Save ${getSavings(plan)}/year
                </p>
              )}
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">Clients: {plan.clients}</p>
                <p className="font-medium text-foreground">Team: {plan.team}</p>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button
              className={`w-full mt-6 ${
                plan.highlighted
                  ? "bg-[#16A34A] hover:bg-[#15803D] text-white"
                  : ""
              }`}
              variant={plan.highlighted ? "default" : "outline"}
              onClick={() => navigate("/waitlist")}
            >
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>

      {/* AI Disclosure */}
      <div className="text-center px-4 mt-8 mb-12">
        <p className="text-sm text-muted-foreground">
          All paid plans include <strong>HomeBase AI</strong>.
        </p>
      </div>

      {/* Plan Notes */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Taxes/fees handled by Stripe. Features evolve during beta.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What counts as a transaction?</h3>
              <p className="text-muted-foreground text-sm">
                A transaction is any payment processed through HomeBase for a subscription, service call, or add-on service.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Can I upgrade or downgrade anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! You can change your plan at any time. Upgrades take effect immediately, and downgrades apply at the end of your billing cycle.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What's included in HomeBase AI?</h3>
              <p className="text-muted-foreground text-sm">
                All paid plans include AI features for smart scheduling, automated communications, and business optimization.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Are there any setup fees?</h3>
              <p className="text-muted-foreground text-sm">
                No setup fees, ever. The free plan is completely free to get started, and paid plans only charge the monthly subscription.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl font-bold mb-6">Ready to grow your business?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join the waitlist and secure your lifetime discount.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/waitlist")}
            className="text-lg px-8"
          >
            Join Waitlist Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; 2025 HomeBase. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
