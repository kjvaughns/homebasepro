import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

interface FeatureGateProps {
  feature: 'ai_insights' | 'advanced_analytics' | 'team_management' | 'api_access';
  children: ReactNode;
}

const featureAccess = {
  ai_insights: ['growth', 'pro', 'scale'],
  advanced_analytics: ['pro', 'scale'],
  team_management: ['growth', 'pro', 'scale'],
  api_access: ['scale'],
};

const featureNames = {
  ai_insights: 'AI Insights',
  advanced_analytics: 'Advanced Analytics',
  team_management: 'Team Management',
  api_access: 'API Access',
};

export const FeatureGate = ({ feature, children }: FeatureGateProps) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, [feature]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasAccess(false);
        return;
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('plan')
        .eq('owner_id', user.id)
        .single();

      const allowedPlans = featureAccess[feature];
      setHasAccess(allowedPlans.includes(org?.plan || 'free'));
    } catch (error) {
      console.error('Error checking feature access:', error);
      setHasAccess(false);
    }
  };

  if (hasAccess === null) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!hasAccess) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{featureNames[feature]} Locked</CardTitle>
          </div>
          <CardDescription>
            This feature requires a higher plan tier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upgrade your plan to unlock {featureNames[feature]} and other premium features.
          </p>
          <Button onClick={() => navigate('/provider/settings/billing')}>
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};
