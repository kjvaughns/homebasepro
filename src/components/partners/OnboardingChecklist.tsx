import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OnboardingChecklistProps {
  partnerId: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export function OnboardingChecklist({ partnerId }: OnboardingChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, [partnerId]);

  const checkOnboardingStatus = async () => {
    setLoading(true);
    try {
      // Fetch partner data
      const { data: partner } = await supabase
        .from('partners')
        .select('*, partner_referrals(*), partner_commissions(*)')
        .eq('id', partnerId)
        .single();

      if (!partner) return;

      // Check referral tracking via clicks table
      const { count: clickCount } = await supabase
        .from('partner_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId);

      const checklist: ChecklistItem[] = [
        {
          id: 'approved',
          label: 'Application approved',
          completed: partner.status === 'ACTIVE'
        },
        {
          id: 'stripe',
          label: 'Stripe Connect account setup',
          completed: !!partner.stripe_account_id
        },
        {
          id: 'link_shared',
          label: 'First referral link shared',
          completed: (clickCount || 0) > 0
        },
        {
          id: 'click',
          label: 'First click tracked',
          completed: (clickCount || 0) > 0
        },
        {
          id: 'signup',
          label: 'First signup attributed',
          completed: partner.partner_referrals?.length > 0
        },
        {
          id: 'commission',
          label: 'First commission earned',
          completed: partner.partner_commissions?.length > 0
        },
        {
          id: 'payout',
          label: 'First payout received',
          completed: partner.partner_commissions?.some((c: any) => c.status === 'PAID')
        }
      ];

      setItems(checklist);
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const progress = (completedCount / items.length) * 100;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Progress</CardTitle>
        <CardDescription>
          Complete these steps to get the most out of your partnership
        </CardDescription>
        <Progress value={progress} className="mt-2" />
        <p className="text-sm text-muted-foreground mt-2">
          {completedCount} of {items.length} completed
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
