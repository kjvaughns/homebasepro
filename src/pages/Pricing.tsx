import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Pricing = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Free Plan",
      subtitle: "Starter",
      priceMonthly: 0,
      priceAnnual: 0,
      clients: "Up to 5 clients",
      fee: "8% per transaction",
      target: "Solo techs & new providers",
      features: [
        "Client Management",
        "Recurring Billing",
        "Basic Support",
        "Mobile Access",
      ],
      cta: "Start Free",
      highlighted: false,
    },
    {
      name: "Growth",
      priceMonthly: 49,
      priceAnnual: 39, // ~20% discount
      clients: "Up to 20 clients",
      fee: "2.5% per transaction",
      target: "Small operators building subscriptions",
      features: [
        "Everything in Free",
        "Automated Reminders",
        "1 Team Member",
        "Review Requests",
        "Basic Analytics",
        "Priority Support",
      ],
      cta: "Start Growth",
      highlighted: true,
    },
    {
      name: "Pro",
      priceMonthly: 129,
      priceAnnual: 103, // ~20% discount
      clients: "Up to 50 clients",
      fee: "2.0% per transaction",
      target: "Established providers",
      features: [
        "Everything in Growth",
        "3 Team Members",
        "White-Label Branding",
        "Advanced Analytics",
        "Custom Domain",
        "Premium Support",
      ],
      cta: "Start Pro",
      highlighted: false,
    },
    {
      name: "Scale",
      priceMonthly: 299,
      priceAnnual: 239, // ~20% discount
      clients: "100+ clients",
      fee: "1.5% per transaction",
      target: "Multi-location & agencies",
      features: [
        "Everything in Pro",
        "Unlimited clients",
        "Unlimited Team Members",
        "API Access & Integrations",
        "Full Analytics Suite",
        "Dedicated Account Manager",
      ],
      cta: "Start Scale",
      highlighted: false,
    },
  ];

  const getPrice = (plan: typeof plans[0]) => {
    if (plan.priceMonthly === 0) return "$0";
    return billingPeriod === "monthly" ? `$${plan.priceMonthly}` : `$${plan.priceAnnual}`;
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (plan.priceMonthly === 0) return null;
    const monthlyCost = plan.priceMonthly * 12;
    const annualCost = plan.priceAnnual * 12;
    const savings = monthlyCost - annualCost;
    return savings > 0 ? `Save $${savings}/year` : null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Home className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">HomeBase</span>
          </div>
          <Button onClick={() => navigate("/auth")} variant="outline">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Start free, scale as you grow. No hidden fees, no surprises.
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
          
          {billingPeriod === "annual" && (
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              🎉 Save up to 20% with annual billing
            </div>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 pb-20">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`p-6 flex flex-col relative ${
                  plan.highlighted
                    ? "border-2 border-primary shadow-xl ring-2 ring-primary/20"
                    : "border hover:border-primary/50 transition-all"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                
                <div className="text-center mb-6 pb-6 border-b">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  {plan.subtitle && (
                    <p className="text-xs text-muted-foreground mb-4">{plan.subtitle}</p>
                  )}
                  
                  <div className="mb-2">
                    <span className="text-4xl font-bold">{getPrice(plan)}</span>
                    {plan.priceMonthly > 0 && (
                      <span className="text-sm text-muted-foreground">
                        /{billingPeriod === "monthly" ? "mo" : "mo"}
                      </span>
                    )}
                  </div>
                  
                  {billingPeriod === "annual" && getSavings(plan) && (
                    <div className="text-xs font-medium text-primary">
                      {getSavings(plan)}
                    </div>
                  )}
                  
                  {plan.priceMonthly === 0 && (
                    <p className="text-sm text-muted-foreground">Forever free</p>
                  )}
                  
                  {billingPeriod === "annual" && plan.priceMonthly > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ${plan.priceAnnual * 12}/year
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-4 text-sm">
                  <div className="flex items-center justify-center gap-2 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{plan.clients}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 font-medium text-accent">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>{plan.fee}</span>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground mb-6 pb-4 border-b">
                  {plan.target}
                </p>

                <ul className="space-y-2.5 mb-6 flex-grow text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate("/onboarding/provider")}
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What counts as a transaction?</h3>
              <p className="text-muted-foreground">
                A transaction is any payment processed through HomeBase for a subscription, service call, or add-on service.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Can I upgrade or downgrade anytime?</h3>
              <p className="text-muted-foreground">
                Yes! You can change your plan at any time. Upgrades take effect immediately, and downgrades apply at the end of your billing cycle.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What happens if I exceed my client limit?</h3>
              <p className="text-muted-foreground">
                We'll notify you when you're approaching your limit. You can upgrade to a higher tier or we'll help you manage your active clients.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Are there any setup fees?</h3>
              <p className="text-muted-foreground">
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
          <p className="text-xl text-muted-foreground mb-8">
            Start with our free plan today. No credit card required.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/onboarding/provider")}
            className="text-lg px-8"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 HomeBase. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
