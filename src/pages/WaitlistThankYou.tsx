import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/referral/ProgressBar";
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

export default function WaitlistThankYou() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const state = (location.state || {}) as ThankYouState;
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string>("");
  const [totalReferred, setTotalReferred] = useState<number>(0);

  // Extract specific values to stabilize dependencies
  const stateReferralCode = state.referral_code;
  const stateWaitlistId = state.waitlist_id;
  const stateEmail = state.email;
  const stateFullName = state.full_name;
  const stateAccountType = state.account_type;
  const stateTotalReferred = state.total_referred;

  useEffect(() => {
    document.title = "HomeBase – Waitlist Confirmed";
    const existing = document.querySelector('meta[name="description"]');
    if (existing) existing.setAttribute("content", "You're on the HomeBase early access list. Early adopter perks secured.");

    let isMounted = true;
    let hasCalledEdgeFunction = false;

    const fetchOrCreateProfile = async () => {
      try {
        // Priority: state > localStorage
        const existingCode = stateReferralCode || localStorage.getItem('homebase_referral_code');
        const existingReferred = stateTotalReferred || parseInt(localStorage.getItem('homebase_total_referred') || '0');

        // If we have code from state/localStorage, use it
        if (existingCode) {
          if (isMounted) {
            setReferralCode(existingCode);
            setTotalReferred(existingReferred);
            setIsLoading(false);
          }
          
          // Update localStorage if not already there
          if (!localStorage.getItem('homebase_referral_code')) {
            localStorage.setItem('homebase_referral_code', existingCode);
            localStorage.setItem('homebase_total_referred', existingReferred.toString());
          }
          return;
        }

        // Only call edge function if we have email/waitlistId and haven't called yet
        if ((!stateEmail && !stateWaitlistId) || hasCalledEdgeFunction) {
          if (isMounted) setIsLoading(false);
          return;
        }

        hasCalledEdgeFunction = true;
        setIsLoading(true);

        const { data, error } = await supabase.functions.invoke('get-or-create-referral-profile', {
          body: {
            email: stateEmail || undefined,
            waitlist_id: stateWaitlistId || undefined,
            full_name: stateFullName || undefined,
            role: stateAccountType || 'homeowner'
          }
        });

        if (error) throw error;

        if (data && isMounted) {
          const code = data.referral_code;
          const referred = data.total_referred || 0;
          
          setReferralCode(code);
          setTotalReferred(referred);
          
          localStorage.setItem('homebase_referral_code', code);
          localStorage.setItem('homebase_total_referred', referred.toString());
        }
      } catch (error) {
        console.error('Error fetching referral profile:', error);
        if (isMounted) {
          toast({
            title: "Notice",
            description: "Your waitlist spot is confirmed! Referral link will be available shortly.",
            variant: "default",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOrCreateProfile();

    return () => {
      isMounted = false;
    };
  }, [stateReferralCode, stateWaitlistId, stateEmail, stateFullName, stateAccountType, stateTotalReferred, toast]);

  const referralLink = referralCode 
    ? `https://homebase.app/club/${referralCode}` 
    : "";

  const handleCopyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link copied!",
        description: "Share it with your friends to unlock rewards.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading your referral portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="space-y-8 text-center">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">
              Welcome to the HomeBase Club 🎉
            </h1>
            <p className="text-sm text-muted-foreground">
              You're on the Early Access List. Invite 5 friends to unlock $50 credit + Beta Access.
            </p>
          </div>

          {/* Main Card */}
          <Card className="p-8 shadow-md space-y-6 text-left">
            {/* Progress Section */}
            <div>
              <ProgressBar 
                current={totalReferred} 
                target={5} 
                label="Your Progress"
              />
            </div>

            {/* Rewards List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Your Rewards</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span>💵</span>
                  <span className="text-muted-foreground">
                    $50 Service Credit (unlocks at 5 referrals)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span>🚀</span>
                  <span className="text-muted-foreground">
                    Priority Beta Access (at 5 referrals)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span>🏠</span>
                  <span className="text-muted-foreground">
                    Personalized maintenance plan at launch
                  </span>
                </div>
              </div>
            </div>

            {/* Referral Block */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Your Referral Link</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="flex-1 px-3 py-2 text-sm rounded-md border bg-muted text-foreground"
                  />
                  <Button
                    onClick={handleCopyLink}
                    className="bg-[#16A34A] hover:bg-[#15803D] text-white"
                  >
                    Copy Link
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Your code: <span className="font-mono font-semibold">{referralCode}</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Primary CTA */}
          <Button
            size="lg"
            onClick={() => navigate("/club")}
            className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white text-lg"
          >
            🎁 Go to Referral Club
          </Button>

          {/* Demo CTAs */}
          <div className="pt-8 border-t space-y-3">
            <p className="text-sm text-muted-foreground">
              Want a sneak peek at what you'll get?
            </p>
            
            {state?.account_type === "homeowner" && (
              <Button
                variant="outline"
                onClick={() => navigate("/demo/homeowner")}
                className="w-full"
              >
                👤 View Homeowner Demo
              </Button>
            )}
            
            {state?.account_type === "provider" && (
              <Button
                variant="outline"
                onClick={() => navigate("/demo/serviceprovider")}
                className="w-full"
              >
                🏢 View Provider Demo
              </Button>
            )}
            
            {!state?.account_type && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/demo/homeowner")}
                >
                  👤 Homeowner
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/demo/serviceprovider")}
                >
                  🏢 Provider
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
