import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ThankYouState {
  full_name?: string;
  account_type?: "homeowner" | "provider";
  waitlistPosition?: number;
}

const pricingPlans = [
  { name: "Free Plan", original: 0, discounted: 0, fee: "8% → 6%" },
  { name: "Growth", original: 49, discounted: 37, fee: "2.5% → 1.9%" },
  { name: "Pro", original: 129, discounted: 97, fee: "2.0% → 1.5%" },
  { name: "Scale", original: 299, discounted: 224, fee: "1.5% → 1.1%" },
];

export default function WaitlistThankYou() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as ThankYouState;
  const firstName = (state.full_name || "").split(" ")[0] || undefined;

  useEffect(() => {
    document.title = "HomeBase – Waitlist Confirmed";
    // meta description (simple, no external deps)
    const existing = document.querySelector('meta[name="description"]');
    if (existing) existing.setAttribute("content", "You're on the HomeBase early access list. Early adopter perks secured.");
  }, []);

  const isHomeowner = state.account_type === "homeowner";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl md:text-3xl">
            Thank you{firstName ? `, ${firstName}` : ""}! 🎉
          </CardTitle>
          <CardDescription>
            {isHomeowner
              ? "You're on the homeowner early access list."
              : "You're on the provider early access list."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {typeof state.waitlistPosition === "number" && (
            <div className="bg-primary/5 p-6 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Your Waitlist Position</p>
              <p className="text-4xl font-bold text-primary">#{state.waitlistPosition}</p>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Your Early Adopter Perks</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <li className="p-3 border rounded-lg">🎁 Lifetime 25% discount locked in</li>
              <li className="p-3 border rounded-lg">⚡ Priority access at launch</li>
              <li className="p-3 border rounded-lg">💬 Influence the roadmap with feedback</li>
              {isHomeowner ? (
                <li className="p-3 border rounded-lg">🔒 Simple, transparent homeowner pricing</li>
              ) : (
                <li className="p-3 border rounded-lg">💼 Discounted platform fees for providers</li>
              )}
            </ul>
          </div>

          {isHomeowner && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Your Discounted Pricing</h3>
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
                These homeowner rates are locked for life at launch.
              </p>
            </div>
          )}

          {!isHomeowner && (
            <div className="space-y-2 text-sm">
              <h3 className="font-semibold text-lg">What happens next</h3>
              <p className="text-muted-foreground">
                We’ll reach out soon to confirm business details and share provider onboarding and fee discounts.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
            <Button onClick={() => navigate("/pricing")}>See Pricing</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
