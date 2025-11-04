import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TrialBadge = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTrialStatus();
  }, []);

  const loadTrialStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_ends_at, user_type')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.user_type !== 'provider' || !profile.trial_ends_at) {
        setDaysLeft(null);
        return;
      }

      const endDate = new Date(profile.trial_ends_at);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setDaysLeft(diffDays > 0 ? diffDays : 0);
    } catch (error) {
      console.error('Error loading trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || daysLeft === null || daysLeft < 0) return null;

  const getVariant = () => {
    if (daysLeft <= 2) return "destructive";
    if (daysLeft <= 7) return "default";
    return "secondary";
  };

  const getMessage = () => {
    if (daysLeft === 0) return "Trial ends today";
    if (daysLeft === 1) return "1 day left";
    return `${daysLeft} days left`;
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <Badge variant={getVariant()} className="px-3 py-2 text-sm font-medium">
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        Pro Trial: {getMessage()}
      </Badge>
      {daysLeft <= 7 && (
        <Button 
          size="sm" 
          onClick={() => navigate('/provider/settings?tab=billing')}
          className="shadow-lg"
        >
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          Upgrade Now
        </Button>
      )}
    </div>
  );
};
