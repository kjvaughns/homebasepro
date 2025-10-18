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

  useEffect(() => {
    document.title = "HomeBase – Waitlist Confirmed";
    const existing = document.querySelector('meta[name="description"]');
    if (existing) existing.setAttribute("content", "You're on the HomeBase early access list. Early adopter perks secured.");

    const fetchOrCreateProfile = async () => {
      setIsLoading(true);
      
      let code = state.referral_code || 
                 localStorage.getItem('homebase_referral_code');
      
      const waitlistId = state.waitlist_id || localStorage.getItem('homebase_waitlist_id');
      const email = state.email || localStorage.getItem('homebase_email');
      const name = state.full_name || localStorage.getItem('homebase_full_name') || "";
      const type = state.account_type || "homeowner";

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
            localStorage.setItem('homebase_referral_code', data.referral_code);
          }
        } catch (err) {
          console.error('Exception fetching profile:', err);
        }
      }
      
      setIsLoading(false);
    };

    fetchOrCreateProfile();
  }, [state, toast]);

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
