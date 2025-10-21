import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionManager } from "@/components/provider/SubscriptionManager";

export default function BillingSettings() {
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from("organizations")
        .select("plan")
        .eq("owner_id", user.user.id)
        .single();

      if (error) throw error;
      setCurrentPlan(data?.plan || 'free');
    } catch (error) {
      console.error("Error loading organization:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing Settings</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

      <SubscriptionManager 
        currentPlan={currentPlan}
        onPlanChanged={loadOrganization}
      />
    </div>
  );
}
