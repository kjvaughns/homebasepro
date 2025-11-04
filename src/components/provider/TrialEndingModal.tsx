import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, TrendingUp, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TrialEndingModal = () => {
  const [open, setOpen] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkTrialStatus();
  }, []);

  const checkTrialStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_ends_at, user_type')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.user_type !== 'provider' || !profile.trial_ends_at) {
        return;
      }

      const endDate = new Date(profile.trial_ends_at);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setDaysLeft(diffDays);

      // Show modal at day 12 (2 days left)
      if (diffDays === 2) {
        // Check if user has already seen this modal today
        const lastSeen = localStorage.getItem('trial_ending_modal_seen');
        const today = new Date().toDateString();
        
        if (lastSeen !== today) {
          setOpen(true);
          localStorage.setItem('trial_ending_modal_seen', today);
        }
      }
    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  };

  const handleUpgrade = () => {
    setOpen(false);
    navigate('/provider/settings?tab=billing');
  };

  const handleContinueFree = () => {
    setOpen(false);
  };

  if (daysLeft === null || daysLeft !== 2) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Your Pro Trial Ends in {daysLeft} Days</DialogTitle>
          <DialogDescription>
            Choose the plan that works best for your business
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          {/* Free Plan */}
          <div className="border rounded-lg p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Free Plan
                <Badge variant="outline">8% fees</Badge>
              </h3>
              <p className="text-3xl font-bold mt-2">$0<span className="text-sm font-normal text-muted-foreground">/month</span></p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>8% transaction fees</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                <span>Up to 5 clients</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                <span>Basic invoicing</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                <span>Solo user only</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Example on a $1,000 job:</p>
              <p className="text-muted-foreground text-sm">You receive: <span className="font-semibold text-foreground">$920</span></p>
              <p className="text-destructive text-xs">Platform fee: $80</p>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleContinueFree}
            >
              Continue with Free
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-primary rounded-lg p-6 space-y-4 relative bg-primary/5">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
              Recommended
            </Badge>
            
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Pro Plan
                <Badge>3% fees</Badge>
              </h3>
              <p className="text-3xl font-bold mt-2">$15<span className="text-sm font-normal text-muted-foreground">/month</span></p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 mt-0.5 text-primary" />
                <span className="font-medium">Only 3% transaction fees</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-primary" />
                <span>Unlimited clients</span>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 mt-0.5 text-primary" />
                <span>AI-powered tools</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                <span>Up to 3 team members</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                <span>Advanced analytics</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                <span>Priority support</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Example on a $1,000 job:</p>
              <p className="text-muted-foreground text-sm">You receive: <span className="font-semibold text-primary">$970</span></p>
              <p className="text-primary text-xs">Platform fee: $30</p>
              <p className="text-sm font-semibold text-primary mt-2">Save $50 vs Free plan! 💰</p>
            </div>

            <Button 
              className="w-full"
              onClick={handleUpgrade}
            >
              Upgrade to Pro
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>On a typical $5,000/month in jobs:</p>
          <p className="mt-1">
            Free plan: You keep $4,600 | Pro plan: You keep $4,835 
            <span className="text-primary font-semibold ml-2">($235 more - pays for itself!)</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
