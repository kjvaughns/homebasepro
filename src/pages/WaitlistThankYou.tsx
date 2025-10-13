import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { ProgressBar } from "@/components/referral/ProgressBar";
import { RoleBanner } from "@/components/referral/RoleBanner";
import { ShareButtons } from "@/components/referral/ShareButtons";
import { Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ThankYouState {
  full_name?: string;
  account_type?: "homeowner" | "provider";
  waitlistPosition?: number;
  referral_code?: string;
  total_referred?: number;
  waitlist_id?: string;
  email?: string;
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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const state = (location.state || {}) as ThankYouState;
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string>("");
  const [totalReferred, setTotalReferred] = useState<number>(0);
  const [accountType, setAccountType] = useState<"homeowner" | "provider">("homeowner");
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    document.title = "HomeBase – Waitlist Confirmed";
    const existing = document.querySelector('meta[name="description"]');
    if (existing) existing.setAttribute("content", "You're on the HomeBase early access list. Early adopter perks secured.");

    const fetchOrCreateProfile = async () => {
      setIsLoading(true);
      
      // Try to get code from multiple sources
      let code = state.referral_code || 
                 searchParams.get('code') || 
                 searchParams.get('ref') ||
                 localStorage.getItem('homebase_referral_code') ||
                 sessionStorage.getItem('homebase_referral_code');
      
      const waitlistId = state.waitlist_id || localStorage.getItem('homebase_waitlist_id');
      const email = state.email || localStorage.getItem('homebase_email');
      const name = state.full_name || localStorage.getItem('homebase_full_name') || "";
      const type = state.account_type || "homeowner";

      setFullName(name);
      setAccountType(type);

      // If we have a code, fetch stats
      if (code) {
        setReferralCode(code);
        localStorage.setItem('homebase_referral_code', code);
        
        const { data: stats } = await supabase
          .from('referral_stats')
          .select('*')
          .eq('referrer_code', code)
          .maybeSingle();
        
        if (stats) {
          setTotalReferred(stats.total_referred || 0);
        } else {
          setTotalReferred(state.total_referred || 0);
        }
        
        setIsLoading(false);
        return;
      }

      // No code found, try to fetch/create profile
      if (waitlistId || email) {
        try {
          const { data, error } = await supabase.functions.invoke(
            'get-or-create-referral-profile',
            {
              body: {
                waitlist_id: waitlistId || undefined,
                email: email || undefined,
                full_name: name || undefined,
                role: type
              }
            }
          );

          if (error) {
            console.error('Error fetching profile:', error);
            toast({
              title: "Could not load referral data",
              description: "Please contact support if this persists.",
              variant: "destructive"
            });
          } else if (data) {
            setReferralCode(data.referral_code);
            setTotalReferred(data.total_referred || 0);
            setAccountType(data.role || type);
            localStorage.setItem('homebase_referral_code', data.referral_code);
          }
        } catch (err) {
          console.error('Exception fetching profile:', err);
        }
      }
      
      setIsLoading(false);
    };

    fetchOrCreateProfile();
  }, [state, searchParams, toast]);

  const firstName = fullName.split(" ")[0] || undefined;
  const isHomeowner = accountType === "homeowner";
  const referralLink = referralCode ? `${window.location.origin}/waitlist?ref=${referralCode}` : "";
  const perksUnlocked = totalReferred >= 5;
  const percentage = Math.round((totalReferred / 5) * 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8 text-center">
          <p>Loading your referral portal...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl md:text-3xl">
            Welcome to the HomeBase {isHomeowner ? 'Club' : 'Provider Network'}{firstName ? `, ${firstName}` : ""}! 🎉
          </CardTitle>
          <CardDescription className="text-base">
            {isHomeowner
              ? "You're officially on the Homeowner Early Access List. Invite 5 friends to unlock your $50 HomeBase Service Credit and secure Beta Access."
              : "You're officially on the Provider Early Access List. Invite 5 providers or homeowners to unlock 25% off for life on your plan and secure Beta Access."}
          </CardDescription>

          {/* Referral Code Display */}
          {referralCode && (
            <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Your Referral Code</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <code className="text-xl sm:text-2xl font-bold tracking-wider px-4 py-2 bg-background rounded-md border-2">
                  {referralCode}
                </code>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(referralCode);
                    toast({
                      title: "Copied!",
                      description: "Referral code copied to clipboard",
                    });
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Copy Code
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Section */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg sm:text-xl">💼 Your Progress</h3>
              <p className="text-2xl sm:text-3xl font-bold">
                {totalReferred} / 5 • {percentage}% Complete
              </p>
            </div>

            <ProgressBar current={totalReferred} target={5} label="Referrals to unlock" />

            {perksUnlocked && (
              <div className="bg-card rounded-lg p-4 text-center space-y-2">
                <p className="font-semibold text-primary text-lg">
                  🎉 You've unlocked Beta Access and your rewards!
                </p>
              </div>
            )}
          </div>

          {/* Unlock Requirements Warning */}
          <div className="bg-yellow-500/10 border-2 border-yellow-500/40 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <div className="space-y-2">
                <p className="font-bold text-base">Perks unlock at 5 referrals</p>
                <p className="text-sm text-muted-foreground">
                  Share your link with 5 friends who sign up <strong>AND</strong> make a purchase to unlock your rewards and beta access.
                </p>
              </div>
            </div>
          </div>

          {/* Perks Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              {isHomeowner ? '🏠 Your Homeowner Perks' : '⚙️ Your Provider Perks'}
            </h3>
            <ul className="space-y-2 text-sm">
              {isHomeowner ? (
                <>
                  <li className="flex items-start gap-3 p-3 border rounded-lg">
                    <span className="text-xl">🏡</span>
                    <div>
                      <p className="font-semibold">$50 service credit</p>
                      <p className="text-xs text-muted-foreground">Unlocks when you reach 5 eligible referrals</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 p-3 border rounded-lg">
                    <span className="text-xl">🚀</span>
                    <div>
                      <p className="font-semibold">Priority Beta Access</p>
                      <p className="text-xs text-muted-foreground">Automatic at 5 referrals</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 p-3 border rounded-lg">
                    <span className="text-xl">💡</span>
                    <p className="font-semibold">Personalized home maintenance plan at launch</p>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-3 p-3 border rounded-lg">
                    <span className="text-xl">💸</span>
                    <div>
                      <p className="font-semibold">25% off for life</p>
                      <p className="text-xs text-muted-foreground">Unlocks when you reach 5 eligible referrals</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 p-3 border rounded-lg">
                    <span className="text-xl">🚀</span>
                    <div>
                      <p className="font-semibold">Priority Beta Access</p>
                      <p className="text-xs text-muted-foreground">Automatic at 5 referrals</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 p-3 border rounded-lg">
                    <span className="text-xl">📈</span>
                    <p className="font-semibold">Early listing in the HomeBase provider directory</p>
                  </li>
                </>
              )}
            </ul>
            
            {/* Fine Print */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-xs text-muted-foreground">
              <p className="font-semibold mb-2">🔒 How it works:</p>
              <p>
                An eligible referral is someone who signs up through your link <strong>AND</strong> makes a purchase. 
                {isHomeowner 
                  ? ' Credits unlock once 5 eligible referrals are confirmed.'
                  : ' Lifetime discount unlocks after 5 eligible referrals.'
                } Beta access is automatic when you reach your goal.
              </p>
            </div>
          </div>

          <RoleBanner role={accountType} />
          
          {referralLink && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Share Your Referral Link</h3>
                <p className="text-sm text-muted-foreground">
                  Share this link to start unlocking your perks
                </p>
              </div>
              
              <ReferralCard referralLink={referralLink} />
              
              <ShareButtons 
                referralLink={referralLink}
                shareText={`Join me on HomeBase and ${isHomeowner ? 'get amazing home services' : 'grow your business'}!`}
              />
            </div>
          )}

          {typeof state.waitlistPosition === "number" && (
            <div className="bg-primary/5 p-6 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Your Waitlist Position</p>
              <p className="text-4xl font-bold text-primary">#{state.waitlistPosition}</p>
            </div>
          )}


          {!isHomeowner && (
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
                These provider rates are locked for life once you unlock them at launch
              </p>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-3">What happens next?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We'll notify you when HomeBase launches. Start sharing your link now to unlock your perks!
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {referralCode && (
              <Button 
                onClick={() => navigate("/club")}
                size="lg"
                className="w-full"
              >
                🎯 View Full Referral Dashboard
              </Button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
              <Button variant="outline" onClick={() => navigate("/pricing")}>View Pricing</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}