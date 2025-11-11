import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Users, DollarSign, Zap, Check } from "lucide-react";

export default function PartnersIndex() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Earn recurring revenue helping pros run their business
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              HomeBase Partners get lifetime commissions for every service provider they onboard — with simple links, promo codes, and a dashboard that just works.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button size="lg" onClick={() => navigate("/partners/apply?type=PRO")}>
                Apply as Pro Partner
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/partners/apply?type=CREATOR")}>
                Apply as Creator
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Tracks */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Choose Your Partner Track</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 border-2 border-primary/20 hover:border-primary transition-colors">
              <div className="space-y-4">
                <TrendingUp className="h-12 w-12 text-primary" />
                <h3 className="text-2xl font-bold">Pro Partner</h3>
                <p className="text-3xl font-bold text-primary">25% lifetime commission</p>
                <p className="text-muted-foreground">
                  For agencies, consultants, and service pros with clients who need HomeBase
                </p>
                <ul className="space-y-2 mt-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span>White-label option available</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span>Client onboarding support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span>15% discount code for clients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span>Dedicated partner manager</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" onClick={() => navigate("/partners/apply?type=PRO")}>
                  Apply as Pro Partner
                </Button>
              </div>
            </Card>

            <Card className="p-8 border-2 border-accent/20 hover:border-accent transition-colors">
              <div className="space-y-4">
                <Users className="h-12 w-12 text-accent" />
                <h3 className="text-2xl font-bold">Creator Partner</h3>
                <p className="text-3xl font-bold text-accent">15-20% lifetime commission</p>
                <p className="text-muted-foreground">
                  For creators, influencers, and thought leaders with engaged audiences
                </p>
                <ul className="space-y-2 mt-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-accent" />
                    <span>Creator marketing kit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-accent" />
                    <span>Custom promo codes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-accent" />
                    <span>10% discount code for audience</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-accent" />
                    <span>Collabs for top performers</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline" onClick={() => navigate("/partners/apply?type=CREATOR")}>
                  Apply as Creator
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-muted/30 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Partner Benefits</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <DollarSign className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Lifetime Commissions</h3>
              <p className="text-muted-foreground">
                Earn on every payment while your referrals stay active. No caps, no limits.
              </p>
            </Card>
            <Card className="p-6">
              <Zap className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Automatic Tracking</h3>
              <p className="text-muted-foreground">
                Simple referral links and promo codes that track everything automatically.
              </p>
            </Card>
            <Card className="p-6">
              <TrendingUp className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Monthly Payouts</h3>
              <p className="text-muted-foreground">
                Get paid automatically via Stripe Connect. No invoicing, no chasing payments.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-2">Do you pay on renewals?</h3>
              <p className="text-muted-foreground">
                Yes! You earn lifetime commissions on every payment while the customer stays active. That includes monthly or annual renewals.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-2">When do payouts happen?</h3>
              <p className="text-muted-foreground">
                Payouts are processed monthly via Stripe Connect, directly to your bank account. Set up takes 2 minutes.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-2">How do discounts work?</h3>
              <p className="text-muted-foreground">
                Each partner gets an automatic discount code (10-15% off) that your referrals can use at checkout.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-2">Can I change my code?</h3>
              <p className="text-muted-foreground">
                Request a code change via your dashboard or contact your partner manager.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to become a partner?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join hundreds of partners earning recurring revenue with HomeBase
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/partners/apply")}>
              Apply Now
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/partners/login")}>
              Partner Login
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
