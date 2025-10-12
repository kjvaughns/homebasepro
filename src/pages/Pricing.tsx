import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import homebaseLogo from "@/assets/homebase-logo.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Pricing = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Free",
      subtitle: "Starter",
      priceMonthly: 0,
      priceAnnual: 0,
      clients: "Up to 5 clients",
      fee: "8.0%",
      teamMembers: "Owner only",
      target: "New providers testing the platform",
      features: [
        "Provider profile + directory listing",
        "Receive homeowner leads (limited)",
        "Basic calendar (manual scheduling)",
        "In-app client messaging",
        "Basic job history & photo upload",
        "Basic invoices (send & mark paid)",
        "Dashboard (high-level stats)",
        "Google Calendar (read), Email notifications",
        "Help Center support",
      ],
      aiFeatures: [],
      cta: "Start Free",
      highlighted: false,
    },
    {
      name: "Growth",
      priceMonthly: 49,
      priceAnnual: 39,
      clients: "Up to 20 clients",
      fee: "2.5%",
      teamMembers: "1 included",
      target: "Active providers building subscriptions",
      features: [
        "Everything in Free",
        "Automations: no-show follow-ups, overdue pings",
        "Quotes → Jobs pipeline",
        "Recurring plans/subscriptions (Stripe Connect)",
        "Client profiles with service history",
        "Simple route grouping (same-area clustering)",
        "Reviews booster (request after completion)",
        "Stripe, QuickBooks (export), Google Calendar (2-way), Zapier",
        "Reporting: bookings, revenue, repeat rate (12 mo)",
        "Priority Support",
      ],
      aiFeatures: [
        "Smart scheduling suggestions",
        "Auto reminders & status updates (SMS/Email)",
        "AI quick replies in chat",
        "Seasonal task nudges for clients",
      ],
      aiBadge: "HomeBase AI (Core)",
      cta: "Start Growth",
      highlighted: true,
    },
    {
      name: "Pro",
      priceMonthly: 129,
      priceAnnual: 103,
      clients: "Up to 50 clients",
      fee: "2.0%",
      teamMembers: "Up to 3",
      target: "Established providers scaling operations",
      features: [
        "Everything in Growth",
        "Team scheduling board (skills/availability)",
        "Multi-stop route optimization with drive-time",
        "Auto review/reputation workflows (Google link)",
        "White-label branding (logo, colors, portal URL)",
        "Job & invoice ledger, payout reconciliation",
        "Analytics: cohort retention, job success %, revenue by zip",
        "Premium Support",
      ],
      aiFeatures: [
        "Everything in Growth AI",
        "Lead scoring & prioritization",
        "Dynamic pricing recommendations",
        "Churn detection & win-back campaigns",
        "Suggested upsells/cross-sells per job",
      ],
      aiBadge: "HomeBase AI+ (Advanced)",
      cta: "Start Pro",
      highlighted: false,
    },
    {
      name: "Scale",
      priceMonthly: 299,
      priceAnnual: 239,
      clients: "100+ clients",
      fee: "1.5%",
      teamMembers: "10 included (+$25 each additional)",
      target: "Multi-location teams & agencies",
      features: [
        "Everything in Pro",
        "Role-based permissions & approvals",
        "API access + webhooks (custom integrations)",
        "Advanced accounting exports (classes/items), payroll prep",
        "Priority listing placement in marketplace",
        "Dedicated success manager",
      ],
      aiFeatures: [
        "Everything in Pro AI",
        "Predictive revenue & capacity forecasting",
        "Territory heatmaps & zip targeting",
        "AI business insights weekly report",
        "Voice commands (beta)",
      ],
      aiBadge: "HomeBase AI Suite (Full)",
      cta: "Start Scale",
      highlighted: false,
    },
  ];

  const aiMatrix = [
    { capability: "Smart scheduling suggestions", growth: true, pro: true, scale: true },
    { capability: "Auto client comms (SMS/Email)", growth: true, pro: true, scale: true },
    { capability: "AI quick replies in chat", growth: true, pro: true, scale: true },
    { capability: "Seasonal task nudges", growth: true, pro: true, scale: true },
    { capability: "Lead scoring & prioritization", growth: false, pro: true, scale: true },
    { capability: "Dynamic pricing recommendations", growth: false, pro: true, scale: true },
    { capability: "Churn detection & win-backs", growth: false, pro: true, scale: true },
    { capability: "Upsell/cross-sell suggestions", growth: false, pro: true, scale: true },
    { capability: "Route optimization (multi-stop)", growth: false, pro: true, scale: true },
    { capability: "Predictive revenue/capacity", growth: false, pro: false, scale: true },
    { capability: "Territory heatmaps", growth: false, pro: false, scale: true },
    { capability: "Weekly AI insights report", growth: false, pro: false, scale: true },
    { capability: "Voice assistant (beta)", growth: false, pro: false, scale: true },
    { capability: "API/webhooks", growth: false, pro: false, scale: true },
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
            <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
            <span className="text-2xl font-bold text-foreground">HomeBase</span>
          </div>
          <Button onClick={() => navigate("/waitlist")} size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
            Join Waitlist
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full mb-6 text-xs sm:text-sm font-medium">
            🚀 Pre-Launch: Join waitlist for lifetime 25% discount
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 px-4">
            Start free, scale as you grow. All paid plans include HomeBase AI.
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-muted p-2 rounded-lg mb-4">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 sm:px-6 py-2 rounded-md font-medium transition-all text-sm sm:text-base ${
                billingPeriod === "monthly"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-4 sm:px-6 py-2 rounded-md font-medium transition-all text-sm sm:text-base ${
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
      <section className="px-4 pb-12">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`p-4 sm:p-6 flex flex-col relative ${
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
                    <span className="text-3xl sm:text-4xl font-bold">{getPrice(plan)}</span>
                    {plan.priceMonthly > 0 && (
                      <span className="text-sm text-muted-foreground">/mo</span>
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

                <div className="space-y-2 mb-4 text-xs sm:text-sm">
                  <div className="flex items-center justify-center gap-2 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{plan.clients}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 font-medium text-accent">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>{plan.fee} transaction fee</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 font-medium text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    <span>{plan.teamMembers}</span>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground mb-4 pb-4 border-b">
                  {plan.target}
                </p>

                {plan.aiBadge && (
                  <div className="mb-4 p-2 bg-primary/10 rounded-lg text-center">
                    <p className="text-xs font-semibold text-primary">✨ {plan.aiBadge}</p>
                  </div>
                )}

                <ul className="space-y-2 mb-6 flex-grow text-xs sm:text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                  {plan.aiFeatures.length > 0 && (
                    <>
                      <li className="pt-2 border-t text-xs font-semibold text-primary">AI Features:</li>
                      {plan.aiFeatures.map((feature, idx) => (
                        <li key={`ai-${idx}`} className="flex items-start gap-2">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                    </>
                  )}
                </ul>

                <Button
                  onClick={() => navigate("/waitlist")}
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  Join Waitlist
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Matrix */}
      <section className="py-12 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            What HomeBase AI Does
          </h2>
          <p className="text-center text-muted-foreground mb-8 text-sm sm:text-base">
            All paid plans include AI-powered features to save you time and grow your business
          </p>
          
          {/* Mobile: Accordion, Desktop: Table */}
          <div className="lg:hidden">
            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem value="growth" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  Growth Plan
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-xs">
                    {aiMatrix.filter(item => item.growth).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                        <span>{item.capability}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="pro" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  Pro Plan
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-xs">
                    {aiMatrix.filter(item => item.pro).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                        <span>{item.capability}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="scale" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  Scale Plan
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-xs">
                    {aiMatrix.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                        <span>{item.capability}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold">AI Capability</th>
                  <th className="text-center py-4 px-4 font-semibold">Growth</th>
                  <th className="text-center py-4 px-4 font-semibold">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold">Scale</th>
                </tr>
              </thead>
              <tbody>
                {aiMatrix.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm">{item.capability}</td>
                    <td className="py-3 px-4 text-center">
                      {item.growth && <Check className="h-5 w-5 text-primary mx-auto" />}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.pro && <Check className="h-5 w-5 text-primary mx-auto" />}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.scale && <Check className="h-5 w-5 text-primary mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Plan Notes */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-muted/50 border border-border rounded-lg p-6 space-y-4 text-sm">
            <h3 className="font-semibold text-lg">Plan Notes</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span><strong>Eligible referrals perk:</strong> Providers who reach 5 eligible referrals unlock 25% off for life on their plan (applied at checkout after verification).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span><strong>Beta access:</strong> Anyone who reaches 5 eligible referrals gets beta access.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span><strong>"Eligible referral"</strong> = signs up with your link and makes a purchase.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">What counts as a transaction?</h3>
              <p className="text-muted-foreground text-sm">
                A transaction is any payment processed through HomeBase for a subscription, service call, or add-on service.
              </p>
            </Card>
            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Can I upgrade or downgrade anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! You can change your plan at any time. Upgrades take effect immediately, and downgrades apply at the end of your billing cycle.
              </p>
            </Card>
            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">What's included in HomeBase AI?</h3>
              <p className="text-muted-foreground text-sm">
                All paid plans include AI features that scale with your tier. Growth gets smart scheduling and automated communications, Pro adds lead scoring and pricing optimization, and Scale includes predictive forecasting and territory analysis.
              </p>
            </Card>
            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Are there any setup fees?</h3>
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
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Ready to grow your business?</h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 px-4">
            Join the waitlist and secure your lifetime discount.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/waitlist")}
            className="text-base sm:text-lg px-6 sm:px-8"
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