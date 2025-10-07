import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Free Plan",
      subtitle: "Starter",
      price: "$0",
      period: "forever",
      clients: "Up to 5 clients",
      fee: "8% per transaction",
      target: "Solo techs & new providers",
      features: [
        "Client Management",
        "Recurring Billing",
        "Basic Support",
        "Mobile Access",
      ],
      notIncluded: [
        "Automated Reminders",
        "Team Members",
        "Review Requests",
        "White-Label Branding",
        "Analytics Dashboard",
      ],
      cta: "Start Free",
      highlighted: false,
    },
    {
      name: "Growth Plan",
      price: "$49",
      period: "per month",
      clients: "Up to 20 clients",
      fee: "2.5% per transaction",
      target: "Small operators building subscriptions",
      features: [
        "Everything in Free",
        "Up to 20 clients",
        "Automated Reminders",
        "1 Team Member",
        "Review Requests",
        "Basic Analytics",
        "Priority Support",
      ],
      notIncluded: [
        "White-Label Branding",
        "Advanced Analytics",
      ],
      cta: "Start Growth",
      highlighted: true,
    },
    {
      name: "Pro Plan",
      price: "$129",
      period: "per month",
      clients: "Up to 50 clients",
      fee: "2.0% per transaction",
      target: "Established providers",
      features: [
        "Everything in Growth",
        "Up to 50 clients",
        "3 Team Members",
        "White-Label Branding",
        "Advanced Analytics",
        "Custom Domain",
        "Premium Support",
      ],
      notIncluded: [
        "API Access",
      ],
      cta: "Start Pro",
      highlighted: false,
    },
    {
      name: "Scale Plan",
      price: "$299",
      period: "per month",
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
        "Custom Onboarding",
      ],
      notIncluded: [],
      cta: "Start Scale",
      highlighted: false,
    },
  ];

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
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            🎉 Free plan includes everything you need to get started
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 px-4 pb-20">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`p-6 flex flex-col ${
                  plan.highlighted
                    ? "border-2 border-primary shadow-lg scale-105 bg-card"
                    : "border-2 hover:border-primary/50 transition-all"
                }`}
              >
                {plan.highlighted && (
                  <div className="bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-full self-start mb-4">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                  {plan.subtitle && (
                    <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                  )}
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">/{plan.period}</span>
                  </div>
                </div>

                <div className="mb-6 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium">{plan.clients}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="font-medium">{plan.fee}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-6 pb-6 border-b">
                  {plan.target}
                </p>

                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 opacity-40">
                      <div className="h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-3 h-0.5 bg-muted-foreground" />
                      </div>
                      <span className="text-sm">{feature}</span>
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
